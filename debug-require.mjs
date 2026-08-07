import('./src/components/ScreenScaffold.tsx')
  .then((m) => console.log('OK', Object.keys(m)))
  .catch((e) => console.log('ERR', e.stack));
