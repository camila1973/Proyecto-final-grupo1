import { setOnUnauthorizedHandler, triggerOnUnauthorized } from './authBridge';

afterEach(() => {
  setOnUnauthorizedHandler(null);
});

describe('authBridge', () => {
  it('calls the registered handler when triggerOnUnauthorized is invoked', () => {
    const handler = jest.fn();
    setOnUnauthorizedHandler(handler);
    triggerOnUnauthorized();
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does nothing when no handler is registered', () => {
    expect(() => triggerOnUnauthorized()).not.toThrow();
  });

  it('does not call the old handler after it is replaced with null', () => {
    const handler = jest.fn();
    setOnUnauthorizedHandler(handler);
    setOnUnauthorizedHandler(null);
    triggerOnUnauthorized();
    expect(handler).not.toHaveBeenCalled();
  });

  it('calls the new handler after replacing the old one', () => {
    const first = jest.fn();
    const second = jest.fn();
    setOnUnauthorizedHandler(first);
    setOnUnauthorizedHandler(second);
    triggerOnUnauthorized();
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
