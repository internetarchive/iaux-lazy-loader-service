import type { BundleType } from './bundle-type';
import { LazyLoaderServiceInterface } from './lazy-loader-service-interface';
import { promisedSleep } from './promised-sleep';

export interface LazyLoaderServiceOptions {
  /**
   * The HTMLElement in which we put the script tags, defaults to document.head
   */
  container?: HTMLElement;

  /**
   * The number of retries we should attempt
   */
  retryCount?: number;

  /**
   * The retry interval in seconds
   */
  retryInterval?: number;
}

export class LazyLoaderService implements LazyLoaderServiceInterface {
  // the HTMLElement in which we put the script tags, defaults to document.head
  private container: HTMLElement;

  // the number of retries we should attempt
  private retryCount: number;

  // the retry interval in seconds
  private retryInterval: number;

  /**
   * LazyLoaderService constructor
   *
   * @param options LazyLoaderServiceOptions
   */
  constructor(options?: LazyLoaderServiceOptions) {
    this.container = options?.container ?? document.head;
    this.retryCount = options?.retryCount ?? 2;
    this.retryInterval = options?.retryInterval ?? 1;
  }

  /** @inheritdoc */
  async loadBundle(bundle: {
    module?: string;
    nomodule?: string;
  }): Promise<void> {
    let modulePromise: Promise<void> | undefined;
    let nomodulePromise: Promise<void> | undefined;

    /* istanbul ignore else */
    if (bundle.module) {
      modulePromise = this.loadScript({
        src: bundle.module,
        bundleType: 'module',
      });
    }

    /* istanbul ignore else */
    if (bundle.nomodule) {
      nomodulePromise = this.loadScript({
        src: bundle.nomodule,
        bundleType: 'nomodule',
      });
    }

    return Promise.race([modulePromise, nomodulePromise]);
  }

  /** @inheritdoc */
  async loadScript(options: {
    src: string;
    bundleType?: BundleType;
    attributes?: Record<string, string>;
  }): Promise<void> {
    return this.doLoad(options);
  }

  private async doLoad(options: {
    src: string;
    bundleType?: BundleType;
    attributes?: Record<string, string>;
    retryCount?: number;
    scriptBeingRetried?: HTMLScriptElement;
  }): Promise<void> {
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
      // script has already been loaded, just resolve
      if (script.getAttribute('dynamicImportLoaded')) {
        resolve();
        return;
      }

      const scriptBeingRetried = options.scriptBeingRetried;

      // If multiple requests get made for this script, just stack the `onload`s
      // and `onerror`s and all the callbacks will be called in-order of being received.
      // If we are retrying the load, we use the `onload` / `onerror` from the script being retried

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const originalOnLoad: ((event: Event) => any) | null | undefined =
        script.onload || scriptBeingRetried?.onload;

      script.onload = (event): void => {
        originalOnLoad?.(event);
        script.setAttribute('dynamicImportLoaded', 'true');
        resolve();
      };

      const originalOnError: OnErrorEventHandler | null | undefined =
        script.onerror || scriptBeingRetried?.onerror;

      script.onerror = async (error): Promise<void> => {
        const hasBeenRetried = script.getAttribute('hasBeenRetried');
        if (retryCount < this.retryCount && !hasBeenRetried) {
          script.setAttribute('hasBeenRetried', 'true');
          await promisedSleep(this.retryInterval * 1000);
          this.doLoad({
            ...options,
            retryCount: retryCount + 1,
            scriptBeingRetried: script,
          });
        } else {
          originalOnError?.(error);
          reject(error);
        }
      };
    });
  }

  /**
   * Generate a script tag with all of the proper attributes
   *
   * @param options
   * @returns
   */
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
      case 'module':
        script.setAttribute('type', options.bundleType);
        break;
      // cannot be tested because modern browsers ignore `nomodule`
      /* istanbul ignore next */
      case 'nomodule':
        script.setAttribute(options.bundleType, '');
        break;
      default:
        break;
    }

    return script;
  }
}
