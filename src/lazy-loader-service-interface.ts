import { BundleType } from './bundle-type';

export interface LazyLoaderServiceInterface {
  /**
   * Load a javascript bundle (module and nomodule pair)
   *
   * eg:
   *
   * lazyLoaderService.loadBundle({
   *   module: 'https://my-server.com/module.js',
   *   nomodule: 'https://my-server.com/no-module.js'
   * });
   *
   * @param bundle
   */
  loadBundle(bundle: {
    module?: string;
    nomodule?: string;
  }): Promise<Event | undefined>;

  /**
   * Load a script with a Promise
   *
   * eg.
   *
   * lazyLoaderService.loadScript({
   *   src: 'https://my-server.com/script.js'
   * });
   *
   *
   * @param options
   */
  loadScript(options: {
    src: string;
    bundleType?: BundleType;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    attributes?: Record<string, string>;
  }): Promise<Event | undefined>;
}
