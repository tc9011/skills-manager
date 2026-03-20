import { EventEmitter } from 'node:events';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchMultiselect, cancelSymbol } from './search-multiselect.js';

vi.mock('readline', async (importOriginal) => {
  const actual = await importOriginal<typeof import('readline')>();
  return {
    ...actual,
    createInterface: vi.fn(() => ({ close: vi.fn() })),
    emitKeypressEvents: vi.fn(),
  };
});

class FakeStdin extends EventEmitter {
  isTTY = false;
  setRawMode = vi.fn();
  resume = vi.fn();
  pause = vi.fn();
}

const items = [
  { value: 'alpha', label: 'Alpha' },
  { value: 'beta', label: 'Beta' },
  { value: 'gamma', label: 'Gamma' },
];

let fakeStdin: FakeStdin;
let originalStdinDescriptor: PropertyDescriptor | undefined;
let capturedOutput: string;

function press(key: { name?: string; sequence?: string; ctrl?: boolean; meta?: boolean }): void {
  fakeStdin.emit('keypress', key.sequence ?? '', key);
}

async function flush(): Promise<void> {
  await new Promise((r) => setImmediate(r));
}

// eslint-disable-next-line no-control-regex
const ANSI_RE = /\x1b\[[0-9;]*[A-Za-z]/g;

function stripAnsi(str: string): string {
  return str.replace(ANSI_RE, '');
}

beforeEach(() => {
  capturedOutput = '';
  fakeStdin = new FakeStdin();

  originalStdinDescriptor = Object.getOwnPropertyDescriptor(process, 'stdin');
  Object.defineProperty(process, 'stdin', {
    value: fakeStdin,
    writable: true,
    configurable: true,
  });

  vi.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
    capturedOutput += typeof chunk === 'string' ? chunk : chunk.toString();
    return true;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  if (originalStdinDescriptor) {
    Object.defineProperty(process, 'stdin', originalStdinDescriptor);
  }
});

describe('cancelSymbol', () => {
  it('is a Symbol', () => {
    expect(typeof cancelSymbol).toBe('symbol');
  });

  it('has description "cancel"', () => {
    expect(cancelSymbol.description).toBe('cancel');
  });
});

describe('searchMultiselect – basic submit / cancel', () => {
  it('resolves with empty array when enter pressed with no selection', async () => {
    const promise = searchMultiselect({ message: 'Pick', items });
    press({ name: 'return' });
    expect(await promise).toEqual([]);
  });

  it('resolves with cancelSymbol when escape pressed', async () => {
    const promise = searchMultiselect({ message: 'Pick', items });
    press({ name: 'escape' });
    expect(await promise).toBe(cancelSymbol);
  });

  it('resolves with cancelSymbol when ctrl+c pressed', async () => {
    const promise = searchMultiselect({ message: 'Pick', items });
    press({ name: 'c', ctrl: true });
    expect(await promise).toBe(cancelSymbol);
  });
});

describe('searchMultiselect – initialSelected', () => {
  it('pre-selects items matching initialSelected on submit', async () => {
    const promise = searchMultiselect({ message: 'Pick', items, initialSelected: ['alpha', 'gamma'] });
    press({ name: 'return' });
    expect(await promise).toEqual(['alpha', 'gamma']);
  });

  it('items not in initialSelected start unselected', async () => {
    const promise = searchMultiselect({ message: 'Pick', items, initialSelected: ['alpha'] });
    press({ name: 'return' });
    const result = await promise;
    expect(result).not.toContain('beta');
    expect(result).not.toContain('gamma');
  });
});

describe('searchMultiselect – space selection / deselection', () => {
  it('space selects item at cursor 0 by default', async () => {
    const promise = searchMultiselect({ message: 'Pick', items });
    press({ name: 'space' });
    press({ name: 'return' });
    expect(await promise).toEqual(['alpha']);
  });

  it('space deselects an already-selected item', async () => {
    const promise = searchMultiselect({ message: 'Pick', items, initialSelected: ['alpha'] });
    press({ name: 'space' });
    press({ name: 'return' });
    expect(await promise).not.toContain('alpha');
  });

  it('down then space selects item at index 1', async () => {
    const promise = searchMultiselect({ message: 'Pick', items });
    press({ name: 'down' });
    press({ name: 'space' });
    press({ name: 'return' });
    expect(await promise).toEqual(['beta']);
  });

  it('can select multiple items', async () => {
    const promise = searchMultiselect({ message: 'Pick', items });
    press({ name: 'space' });
    press({ name: 'down' });
    press({ name: 'space' });
    press({ name: 'return' });
    expect(await promise).toEqual(['alpha', 'beta']);
  });
});

describe('searchMultiselect – cursor navigation', () => {
  it('up arrow at index 0 stays at 0 (clamp)', async () => {
    const promise = searchMultiselect({ message: 'Pick', items });
    press({ name: 'up' });
    press({ name: 'space' });
    press({ name: 'return' });
    expect(await promise).toEqual(['alpha']);
  });

  it('down clamps at last item', async () => {
    const promise = searchMultiselect({ message: 'Pick', items });
    press({ name: 'down' });
    press({ name: 'down' });
    press({ name: 'down' });
    press({ name: 'space' });
    press({ name: 'return' });
    expect(await promise).toEqual(['gamma']);
  });
});

describe('searchMultiselect – search / filtering', () => {
  it('typing a character filters items by label (case-insensitive)', async () => {
    const promise = searchMultiselect({ message: 'Pick', items });
    press({ sequence: 'b', name: 'b' });
    press({ name: 'space' });
    press({ name: 'return' });
    expect(await promise).toEqual(['beta']);
  });

  it('filters by value string', async () => {
    const valueItems = [
      { value: 'opt-one', label: 'First' },
      { value: 'opt-two', label: 'Second' },
    ];
    const promise = searchMultiselect({ message: 'Pick', items: valueItems });
    press({ sequence: 'w', name: 'w' });
    press({ name: 'space' });
    press({ name: 'return' });
    expect(await promise).toEqual(['opt-two']);
  });

  it('backspace removes last character and restores full list', async () => {
    const promise = searchMultiselect({ message: 'Pick', items });
    press({ sequence: 'b', name: 'b' });
    press({ name: 'backspace' });
    press({ name: 'space' });
    press({ name: 'return' });
    expect(await promise).toEqual(['alpha']);
  });

  it('typing resets cursor to 0', async () => {
    const promise = searchMultiselect({ message: 'Pick', items });
    press({ name: 'down' });
    press({ sequence: 'a', name: 'a' });
    press({ name: 'space' });
    press({ name: 'return' });
    expect(await promise).toEqual(['alpha']);
  });

  it('no error when query yields empty list', async () => {
    const promise = searchMultiselect({ message: 'Pick', items });
    press({ sequence: 'z', name: 'z' });
    press({ sequence: 'z', name: 'z' });
    press({ sequence: 'z', name: 'z' });
    press({ name: 'escape' });
    expect(await promise).toBe(cancelSymbol);
  });
});

describe('searchMultiselect – required mode', () => {
  it('blocks submit when required=true and nothing selected (no locked items)', async () => {
    const promise = searchMultiselect({ message: 'Pick', items, required: true });
    press({ name: 'return' });

    let resolved = false;
    void promise.then(() => {
      resolved = true;
    });
    await flush();
    expect(resolved).toBe(false);

    press({ name: 'escape' });
    await promise;
  });

  it('allows submit when required=true and at least one item is selected', async () => {
    const promise = searchMultiselect({ message: 'Pick', items, required: true });
    press({ name: 'space' });
    press({ name: 'return' });
    expect(await promise).toEqual(['alpha']);
  });

  it('allows submit when required=true and locked items exist (no user selection needed)', async () => {
    const lockedSection = {
      title: 'Universal',
      items: [{ value: 'locked-item', label: 'Locked' }],
    };
    const promise = searchMultiselect({ message: 'Pick', items, required: true, lockedSection });
    press({ name: 'return' });
    expect(await promise).toContain('locked-item');
  });
});

describe('searchMultiselect – locked section', () => {
  it('locked items are always included in result', async () => {
    const lockedSection = { title: 'Universal', items: [{ value: 'always', label: 'Always' }] };
    const promise = searchMultiselect({ message: 'Pick', items, lockedSection });
    press({ name: 'return' });
    expect(await promise).toContain('always');
  });

  it('locked items appear before user-selected items in result', async () => {
    const lockedSection = { title: 'Universal', items: [{ value: 'locked', label: 'Locked' }] };
    const promise = searchMultiselect({ message: 'Pick', items, lockedSection });
    press({ name: 'space' });
    press({ name: 'return' });
    const result = await promise as string[];
    expect(result[0]).toBe('locked');
    expect(result[1]).toBe('alpha');
  });

  it('multiple locked items are all present in result', async () => {
    const lockedSection = {
      title: 'Universal',
      items: [
        { value: 'lock1', label: 'Lock One' },
        { value: 'lock2', label: 'Lock Two' },
      ],
    };
    const promise = searchMultiselect({ message: 'Pick', items, lockedSection });
    press({ name: 'return' });
    const result = await promise;
    expect(result).toContain('lock1');
    expect(result).toContain('lock2');
  });

  it('result contains only user selection when no locked section provided', async () => {
    const promise = searchMultiselect({ message: 'Pick', items });
    press({ name: 'space' });
    press({ name: 'return' });
    expect(await promise).toEqual(['alpha']);
  });
});

describe('searchMultiselect – stdout rendering', () => {
  it('renders message in initial output', async () => {
    const promise = searchMultiselect({ message: 'Choose agents', items });
    await flush();
    press({ name: 'escape' });
    await promise;
    expect(stripAnsi(capturedOutput)).toContain('Choose agents');
  });

  it('renders "Search:" prompt in active state', async () => {
    const promise = searchMultiselect({ message: 'Pick', items });
    await flush();
    press({ name: 'escape' });
    await promise;
    expect(stripAnsi(capturedOutput)).toContain('Search:');
  });

  it('renders item labels in active state', async () => {
    const promise = searchMultiselect({ message: 'Pick', items });
    await flush();
    press({ name: 'escape' });
    await promise;
    const plain = stripAnsi(capturedOutput);
    expect(plain).toContain('Alpha');
    expect(plain).toContain('Beta');
    expect(plain).toContain('Gamma');
  });

  it('renders "Selected: (none)" when no items selected', async () => {
    const promise = searchMultiselect({ message: 'Pick', items });
    await flush();
    press({ name: 'escape' });
    await promise;
    expect(stripAnsi(capturedOutput)).toContain('Selected: (none)');
  });

  it('renders "+N more" in summary when more than 3 items selected', async () => {
    const manyItems = [
      { value: 'a', label: 'Item A' },
      { value: 'b', label: 'Item B' },
      { value: 'c', label: 'Item C' },
      { value: 'd', label: 'Item D' },
    ];
    const promise = searchMultiselect({ message: 'Pick', items: manyItems, initialSelected: ['a', 'b', 'c', 'd'] });
    await flush();
    press({ name: 'escape' });
    await promise;
    expect(stripAnsi(capturedOutput)).toContain('+1 more');
  });

  it('renders "Cancelled" text after cancel', async () => {
    const promise = searchMultiselect({ message: 'Pick', items });
    press({ name: 'escape' });
    await promise;
    expect(stripAnsi(capturedOutput)).toContain('Cancelled');
  });

  it('renders selected label in submit state', async () => {
    const promise = searchMultiselect({ message: 'Pick', items });
    press({ name: 'space' });
    press({ name: 'return' });
    await promise;
    expect(stripAnsi(capturedOutput)).toContain('Alpha');
  });

  it('renders locked section title when provided', async () => {
    const lockedSection = {
      title: 'Universal Agents',
      items: [{ value: 'cursor', label: 'Cursor' }],
    };
    const promise = searchMultiselect({ message: 'Pick', items, lockedSection });
    await flush();
    press({ name: 'escape' });
    await promise;
    expect(stripAnsi(capturedOutput)).toContain('Universal Agents');
  });

  it('renders "No matches found" when query matches nothing', async () => {
    const promise = searchMultiselect({ message: 'Pick', items });
    press({ sequence: 'z', name: 'z' });
    press({ sequence: 'z', name: 'z' });
    press({ sequence: 'z', name: 'z' });
    await flush();
    expect(stripAnsi(capturedOutput)).toContain('No matches found');
    press({ name: 'escape' });
    await promise;
  });

  it('renders hint text next to item label when provided', async () => {
    const itemsWithHints = [{ value: 'x', label: 'ExampleItem', hint: 'useful hint' }];
    const promise = searchMultiselect({ message: 'Pick', items: itemsWithHints });
    await flush();
    press({ name: 'escape' });
    await promise;
    expect(stripAnsi(capturedOutput)).toContain('useful hint');
  });
});
