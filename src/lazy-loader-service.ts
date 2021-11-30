import { BundleType } from './bundle-type';
import { LazyLoaderServiceInterface } from './lazy-loader-service-interface';

export class LazyLoaderService implements LazyLoaderServiceInterface {
  private container: HTMLElement;

  private retryCount: number;

  constructor(options?: { container?: HTMLElement; retryCount?: number }) {
    this.container = options?.container ?? document.head;
    this.retryCount = options?.retryCount ?? 2;
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
    return this.doLoad(options);
  }

  private async doLoad(options: {
    src: string;
    bundleType?: BundleType;
    attributes?: Record<string, string>;
    retryCount?: number;
    originalElement?: HTMLScriptElement;
  }): Promise<Event | undefined> {
    const retryCount = options.retryCount ?? 0;
    const scriptSelector = `script[src='${options.src}'][async][retryCount='${retryCount}']`;
    let script = this.container.querySelector(
      scriptSelector
    ) as HTMLScriptElement;
    if (!script) {
      script = this.getScriptTag(options);
      this.container.appendChild(script);
    }

    return new Promise((resolve, reject) => {
      const originalElement = options.originalElement;

      // If multiple requests get made for this script, just stack the `onload`s
      // and `onerror`s and all the callbacks will be called in-order of being received.
      // If we are retrying the load, we use the `onload` / `onerror` from the original element

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const originalOnLoad: ((event: Event) => any) | null | undefined =
        script.onload || originalElement?.onload;
      script.onload = (event): void => {
        originalOnLoad?.(event);
        script.setAttribute('dynamicImportLoaded', 'true');
        resolve(event);
      };

      const originalOnError:
        | ((error: string | Event) => any) // eslint-disable-line @typescript-eslint/no-explicit-any
        | null
        | undefined = script.onerror || originalElement?.onerror;
      script.onerror = (error): void => {
        const hasBeenRetried = script.getAttribute('hasBeenRetried');
        if (retryCount < 2 && !hasBeenRetried) {
          script.setAttribute('hasBeenRetried', 'true');
          this.doLoad({
            ...options,
            retryCount: retryCount + 1,
            originalElement: script,
          });
        } else {
          originalOnError?.(error);
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
