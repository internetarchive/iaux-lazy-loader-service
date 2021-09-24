import { BundleType } from './bundle-type';
import { LazyLoaderServiceInterface } from './lazy-loader-service-interface';
import { JavascriptLoaderInterface } from './loaders/javascript-loader';

export class LazyLoaderService implements LazyLoaderServiceInterface {
  private container: HTMLElement;

  private javascriptLoader: JavascriptLoaderInterface;

  constructor(options: {
    container: HTMLElement,
    javascriptLoader: JavascriptLoaderInterface
  }) {
    this.container = options.container;
    this.javascriptLoader = options.javascriptLoader;
  }

  loadBundle(bundle: {
    module?: string | undefined;
    nomodule?: string | undefined; }
  ): Promise<Event | undefined> {
    return this.javascriptLoader.loadBundle(bundle);
  }

  loadScript(options: {
    src: string;
    bundleType?: BundleType | undefined;
    attributes?: { key: string; value: any; }[] | undefined; }
  ): Promise<Event> {
    return this.javascriptLoader.loadScript(options);
  }
}
