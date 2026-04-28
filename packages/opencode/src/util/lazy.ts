export function lazy<T>(fn: () => T) {
  let value: T | undefined
  let loaded = false

  const result = (): T => {
    if (loaded) return value as T
    value = fn()
    loaded = true
    return value as T
  }

  result.reset = () => {
    loaded = false
    value = undefined
  }

  result.peek = () => (loaded ? value : undefined)

  // Reset only if the current value matches `expected`. Used to guard against
  // racing resets where the lazy may have already been rebuilt by another
  // caller after this caller captured a reference.
  result.resetIf = (expected: T) => {
    if (loaded && value === expected) {
      loaded = false
      value = undefined
    }
  }

  return result
}
