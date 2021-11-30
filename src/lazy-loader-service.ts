import { BundleType } from './bundle-type';
import { LazyLoaderServiceInterface } from './lazy-loader-service-interface';

export class LazyLoaderService implements LazyLoaderServiceInterface {
  private container: HTMLElement;

  constructor(container: HTMLElement = document.head) {
    this.container = container;
  }

  /** @inheritdoc */
  async loadBundle(bundle: {
    module?: string;
    nomodule?: string;
  }): Promise<Event | undefined> {
    let modulePromise: Promise<Event | undefined> | undefined;
    let nomodulePromise: Promise<Event | undefined> | undefined;

    /* istanbul ignore else */
    if (bundle.module) {
      modulePromise = this.loadScript({
        src: bundle.module,
        bundleType: BundleType.Module,
      });
    }

    /* istanbul ignore else */
    if (bundle.nomodule) {
      nomodulePromise = this.loadScript({
        src: bundle.nomodule,
        bundleType: BundleType.NoModule,
      });
    }

    return Promise.race([modulePromise, nomodulePromise]);
  }

  /** @inheritdoc */
  async loadScript(options: {
    src: string;
    bundleType?: BundleType;
    attributes?: Record<string, string>;
  }): Promise<Event | undefined> {
    return this.doActualLoad(options);
  }

  private async doActualLoad(options: {
    src: string;
    bundleType?: BundleType;
    attributes?: Record<string, string>;
    retryCount?: number;
    originalElement?: HTMLScriptElement;
  }): Promise<Event | undefined> {
    console.debug('doActualLoad', options);
    const retryCount = options.retryCount ?? 0;
    const scriptSelector = `script[src='${options.src}'][async][retryCount='${retryCount}']`;
    let script = this.container.querySelector(
      scriptSelector
    ) as HTMLScriptElement;
    if (!script) {
      script = this.getScriptTag(options);
      this.container.appendChild(script);
    }
    console.debug('selector, script', scriptSelector, script);

    return new Promise((resolve, reject) => {
      // if multiple requests get made for this script, just stack the onloads
      // and onerrors and all the callbacks will be called in-order of being received
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const originalOnLoad: ((event: Event) => any) | null | undefined =
        script.onload || options.originalElement?.onload;
      console.debug(
        'assigning onload',
        originalOnLoad,
        script.onload,
        options.originalElement?.onload
      );
      script.onload = (event): void => {
        originalOnLoad?.(event);
        script.setAttribute('dynamicImportLoaded', 'true');
        resolve(event);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const originalOnError:
        | ((error: string | Event) => any)
        | null
        | undefined = script.onerror || options.originalElement?.onerror;
      console.debug(
        'assigning onerror',
        originalOnError,
        script.onerror,
        options.originalElement?.onerror
      );
      script.onerror = (error): void => {
        console.debug('onerror callback', retryCount);
        const hasBeenRetried = script.getAttribute('hasBeenRetried');
        if (retryCount < 1 && !hasBeenRetried) {
          script.setAttribute('hasBeenRetried', 'true');
          console.debug('retrying actual load', retryCount);
          this.doActualLoad({
            ...options,
            retryCount: retryCount + 1,
            originalElement: script,
          });
        } else {
          console.debug('rejecting', retryCount);
          originalOnError?.(error);
          // script.parentNode?.removeChild(script);
          reject(error);
        }
      };

      if (script.parentNode === null) {
        this.container.appendChild(script);
      } else if (script.getAttribute('dynamicImportLoaded')) {
        resolve(undefined);
      }
    });
  }

  private getScriptTag(options: {
    src: string;
    retryCount?: number;
    bundleType?: BundleType;
    attributes?: Record<string, string>;
  }): HTMLScriptElement {
    const fixedSrc = options.src.replace("'", '"');
    const script = document.createElement('script') as HTMLScriptElement;
    const retryCount = options.retryCount ?? 0;
    script.setAttribute('src', fixedSrc);
    script.setAttribute('retryCount', retryCount.toString());
    script.async = true;

    const attributes = options.attributes ?? {};
    Object.keys(attributes).forEach(key => {
      script.setAttribute(key, attributes[key]);
    });

    switch (options.bundleType) {
      case BundleType.Module:
        script.setAttribute('type', options.bundleType);
        break;
      // cannot be tested because modern browsers ignore `nomodule`
      /* istanbul ignore next */
      case BundleType.NoModule:
        script.setAttribute(options.bundleType, '');
        break;
      default:
        break;
    }

    return script;
  }
}
