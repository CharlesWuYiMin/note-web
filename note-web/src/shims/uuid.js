function randomHex(bytes) {
  const values = new Uint8Array(bytes)

  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(values)
  } else {
    for (let index = 0; index < values.length; index += 1) {
      values[index] = Math.floor(Math.random() * 256)
    }
  }

  return Array.from(values, (value) => value.toString(16).padStart(2, '0'))
}

export function v4() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID()
  }

  const bytes = randomHex(16)
  bytes[6] = (parseInt(bytes[6], 16) & 0x0f | 0x40).toString(16).padStart(2, '0')
  bytes[8] = (parseInt(bytes[8], 16) & 0x3f | 0x80).toString(16).padStart(2, '0')

  return [
    bytes.slice(0, 4).join(''),
    bytes.slice(4, 6).join(''),
    bytes.slice(6, 8).join(''),
    bytes.slice(8, 10).join(''),
    bytes.slice(10, 16).join(''),
  ].join('-')
}

export default {
  v4,
}
