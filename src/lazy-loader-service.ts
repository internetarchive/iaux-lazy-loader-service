import { BundleType } from './bundle-type';
import { LazyLoaderServiceInterface } from './lazy-loader-service-interface';
import { promisedSleep } from './promised-sleep';

export class LazyLoaderService implements LazyLoaderServiceInterface {
  private container: HTMLElement;

  private retryCount: number;

  /**
   * In seconds
   */
  private retryInterval: number;

  constructor(options?: {
    container?: HTMLElement;
    retryCount?: number;
    retryInterval?: number;
  }) {
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

      const originalOnError:
        | OnErrorEventHandler // eslint-disable-line @typescript-eslint/no-explicit-any
        | null
        | undefined = script.onerror || scriptBeingRetried?.onerror;

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

      // script has already been loaded, just resolve
      if (script.getAttribute('dynamicImportLoaded')) {
        resolve();
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
