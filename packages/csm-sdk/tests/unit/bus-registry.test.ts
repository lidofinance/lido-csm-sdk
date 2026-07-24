import { describe, it, expect } from 'vitest';
import { BusRegistry } from '../../src/common/class-primitives/bus-registry';

type TestModules = {
  foo: { value: number };
  bar: { label: string };
};

describe('BusRegistry', () => {
  it('registers and retrieves a module via get()', () => {
    const bus = new BusRegistry<TestModules>();
    const foo = { value: 42 };
    bus.register(foo, 'foo');

    expect(bus.get('foo')).toBe(foo);
  });

  it('returns undefined for unregistered module via get()', () => {
    const bus = new BusRegistry<TestModules>();
    expect(bus.get('foo')).toBeUndefined();
  });

  it('retrieves via getOrThrow()', () => {
    const bus = new BusRegistry<TestModules>();
    const foo = { value: 1 };
    bus.register(foo, 'foo');

    expect(bus.getOrThrow('foo')).toBe(foo);
  });

  it('throws for unregistered module via getOrThrow()', () => {
    const bus = new BusRegistry<TestModules>();
    expect(() => bus.getOrThrow('foo')).toThrow();
  });

  it('throws on duplicate registration', () => {
    const bus = new BusRegistry<TestModules>();
    bus.register({ value: 1 }, 'foo');

    expect(() => bus.register({ value: 2 }, 'foo')).toThrow(
      'Module foo already registered',
    );
  });

  it('enables direct property access via Proxy', () => {
    const bus = new BusRegistry<TestModules>();
    const foo = { value: 99 };
    bus.register(foo, 'foo');

    const typed = bus as unknown as TestModules & BusRegistry<TestModules>;
    expect(typed.foo).toBe(foo);
  });

  it('Proxy returns undefined for unregistered property', () => {
    const bus = new BusRegistry<TestModules>();
    const typed = bus as unknown as TestModules & BusRegistry<TestModules>;
    expect(typed.bar).toBeUndefined();
  });

  it('registers multiple modules independently', () => {
    const bus = new BusRegistry<TestModules>();
    const foo = { value: 1 };
    const bar = { label: 'hello' };
    bus.register(foo, 'foo');
    bus.register(bar, 'bar');

    expect(bus.get('foo')).toBe(foo);
    expect(bus.get('bar')).toBe(bar);
  });
});
