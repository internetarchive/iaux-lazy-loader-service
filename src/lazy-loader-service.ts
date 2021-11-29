import { BundleType } from './bundle-type';
import { LazyLoaderServiceInterface } from './lazy-loader-service-interface';

export class LazyLoaderService implements LazyLoaderServiceInterface {
  private container: HTMLElement;

  constructor(container: HTMLElement = document.head) {
    this.container = container;
  }

  /** @inheritdoc */
  loadBundle(bundle: {
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

  loadScript(options: {
    src: string;
    bundleType?: BundleType;
    attributes?: Record<string, string>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // onload?: ((event: Event) => any) | null;
    // onerror?: OnErrorEventHandler;
    retryCount?: number;
    // forceReload?: boolean;
    originalScriptElement?: HTMLScriptElement;
  }): Promise<Event | undefined> {
    const retryCount = options.retryCount ?? 0;
    const fixedSrc = options.src.replace("'", '"');
    console.debug('loadScript', fixedSrc);
    const scriptSelector = `script[src='${fixedSrc}'][async][retyCount='${retryCount}']`;
    console.debug('selector', scriptSelector);
    let script = this.container.querySelector(
      scriptSelector
    ) as HTMLScriptElement;
    console.debug('script1', script);

    console.debug('originalScriptElement', options.originalScriptElement);
    // const originalScriptElement = options.originalScriptElement;

    if (!script || options.originalScriptElement) {
      script = this.getScriptTag(options);
      console.debug('script not found, creating new one', script);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalOnLoad: ((event: Event) => any) | null | undefined =
      script.onload;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const originalOnError: ((error: string | Event) => any) | null | undefined =
      script.onerror;

    return new Promise((resolve, reject) => {
      // if multiple requests get made for this script, just stack the onloads
      // and onerrors and all the callbacks will be called in-order of being received
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // const originalOnLoad: ((event: Event) => any) | null = script.onload;
      script.onload = (event): void => {
        options.originalScriptElement?.onload?.(event);
        originalOnLoad?.(event);
        script.setAttribute('dynamicImportLoaded', 'true');
        resolve(event);
      };

      console.debug(
        'setting onerror, originalScriptElement, ',
        options.originalScriptElement?.onerror
      );
      script.onerror = (error): void => {
        // const retryCount = parseInt(script.getAttribute('retryCount') ?? '0');
        console.log('onerror', script, retryCount);
        if (retryCount < 1) {
          const newOptions = options;
          const newSrc = options.src;
          newOptions.retryCount = (options.retryCount ?? 0) + 1;
          newOptions.src = newSrc;
          newOptions.attributes = options.attributes;
          newOptions.originalScriptElement = script;
          console.log('newOptions', newOptions);
          this.loadScript(newOptions);
          return;
        }

        console.debug('FINAL');
        originalOnError?.(error);
        // options.originalScriptElement?.onerror?.(error);
        console.debug('REJECTED');
        reject(error);
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

    // if (attributes.retryCount === undefined) {
    //   script.setAttribute('retryCount', '0');
    // }

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
