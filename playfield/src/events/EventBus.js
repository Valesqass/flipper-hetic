class EventBus {
  #listeners = new Map();

  on(event, fn) {
    if (!this.#listeners.has(event)) this.#listeners.set(event, []);
    this.#listeners.get(event).push(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    const fns = this.#listeners.get(event);
    if (fns) this.#listeners.set(event, fns.filter(f => f !== fn));
  }

  emit(event, data) {
    for (const fn of (this.#listeners.get(event) ?? [])) fn(data);
  }
}

export const eventBus = new EventBus();
