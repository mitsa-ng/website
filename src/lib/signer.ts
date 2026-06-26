import { createHash } from 'crypto'

export type SignMethod = 'hash' | 'signature'

export interface Signer {
  method: SignMethod
  sign(content: string, privateKey?: string): string
  verify(content: string, fingerprint: string, publicKey?: string): boolean
}

class HashSigner implements Signer {
  method: SignMethod = 'hash'

  sign(content: string): string {
    return createHash('sha256').update(content || '').digest('hex')
  }

  verify(content: string, fingerprint: string): boolean {
    return this.sign(content) === fingerprint
  }
}

class SignatureSigner implements Signer {
  method: SignMethod = 'signature'

  sign(_content: string, _privateKey?: string): string {
    return ''
  }

  verify(_content: string, _fingerprint: string, _publicKey?: string): boolean {
    return false
  }
}

export function createSigner(method: SignMethod): Signer {
  switch (method) {
    case 'hash':
      return new HashSigner()
    case 'signature':
      return new SignatureSigner()
  }
}
