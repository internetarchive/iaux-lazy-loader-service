import { BundleType } from './bundle-type';
import { Unsubscribe } from 'nanoevents';

export interface LazyLoaderServiceEvents {
  scriptLoadRetried: (src: string, retryCount: number) => void;
  scriptLoadFailed: (src: string, error: string | Event) => void;
}

export interface LazyLoaderServiceInterface {
  /**
   * Bind to receive credit card flow handler events
   *
   * @template E
   * @param {E} event
   * @param {CreditCardFlowHandlerEvents[E]} callback
   * @returns {Unsubscribe}
   * @memberof CreditCardFlowHandlerInterface
   */
  on<E extends keyof LazyLoaderServiceEvents>(
    event: E,
    callback: LazyLoaderServiceEvents[E]
  ): Unsubscribe;

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
  loadBundle(bundle: { module?: string; nomodule?: string }): Promise<void>;

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
  }): Promise<void>;
}
