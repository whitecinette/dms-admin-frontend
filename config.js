let configPromise;

if (process.env.NODE_ENV === 'production') {
  configPromise = import('./config.prod.json').then(module => module.default);
} else {
  configPromise = import('./config.dev.json').then(module => module.default);
}

const config = await configPromise; // This will wait for the promise to resolve

export default config;