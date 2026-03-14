import App from './App';

describe('App', () => {
  it('exports a function component', () => {
    expect(typeof App).toBe('function');
  });

  it('has the correct display name or name', () => {
    expect(App.name).toBe('App');
  });
});
