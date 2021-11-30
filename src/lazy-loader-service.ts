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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attributes?: { key: string; value: any }[];
  }): Promise<Event | undefined> {
    const scriptSelector = `script[src='${options.src}'][async]`;
    let script = this.container.querySelector(
      scriptSelector
    ) as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script') as HTMLScriptElement;
      script.setAttribute('src', options.src);
      script.async = true;

      const attributes = options.attributes ?? [];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      attributes.forEach((element: any) => {
        // eslint-disable-next-line no-unused-expressions
        script.setAttribute(element.key, element.value);
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
    }

    return new Promise((resolve, reject) => {
      // if multiple requests get made for this script, just stack the onloads
      // and onerrors and all the callbacks will be called in-order of being received
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const originalOnLoad: ((event: Event) => any) | null = script.onload;
      script.onload = (event): void => {
        if (originalOnLoad) {
          originalOnLoad(event);
        }
        script.setAttribute('dynamicImportLoaded', 'true');
        resolve(event);
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const originalOnError: ((error: string | Event) => any) | null =
        script.onerror;
      script.onerror = (error): void => {
        if (originalOnError) {
          originalOnError(error);
        }

        /* istanbul ignore else */
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
        reject(error);
      };

      if (script.parentNode === null) {
        this.container.appendChild(script);
      } else if (script.getAttribute('dynamicImportLoaded')) {
        resolve(undefined);
      }
    });
  }
}
