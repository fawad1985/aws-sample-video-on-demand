const { createSign } = require('node:crypto')


export default async function(event: any) {
  /**
   * Insert your own private key, you can generate it by executing following commands
   * openssl genrsa -out private_key.pem 2048
   * openssl rsa -pubout -in private_key.pem -out public_key.pem
   * You should load this from AWS Secrets Manager
   */
  const privateKey = '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDGKVJOoijJ+XkR\nY9AiuKt07Q+f7eJ0f6XglqjLkn1RCV6pnsOu3Od5q1kJ90gvew6+gDUxnrc7uEaz\n55vzHE4zhRDWm4/bRLSffFtipJfkwubDvX7k9HTmyJFXVsM671WhkHVckHeu+QzI\nhN+XXJjUtxUkKg+2W1vp5EP1+m0eGHMUhMIMNtzayCoO+mSpEOnjQYU4YDNyg9sy\nnHEW1lJqFns0VvHYumIduDgt7TywmBG+ZWPSta4MC+Eg1cGcA+9iiFt4VvXbW6vJ\nqGRrfh6F9KX6yUTrzd9URZYx2l0m2SCBPH9ih5my8/uOWgAe43blJACD9JQT7Rsy\ny1/NUIrrAgMBAAECggEAOnyRtXG5FjvSluZd1RGqUV1yoiJlFzthqxLsiQEYiaV5\nUhjw6ph6nXeMVRuuK41ngaR3jsiojjDKdWjjp3JwRlZ87MqHQBFcOkJK+qdXyYYY\n9Cbm4A6ivkbuVtfd0XQ4UvI/IW3mVTdepYRKNfN3jDjpPX5ImusGCtd7k4sxT5Mk\npU9oU6D4PXwdU22kaGfmK9sI8i2TkdDXn8+ui8M7Z/z+Rrl9j88ocLxSBi0l1Xmd\nQjhx2UDjVmpqGvZZxGWx/+QE7cvCB7bgnoNxltOa8ycVfGwjypQWlg/VPpQ3p94m\nhULRPs3kmuSAEHEmqnPcuVPUuxcPwQt+C7futBBguQKBgQDt1Z4ocMh655hEA7TZ\nZBNBxSlRW4e2DY4aFPdIdO4VP7V1QDq47qf+rlXWr4ltB6+Z1Zoevt3dJnQqoNFx\nOaQjnpmaat2dQSPDq2/N55F0qaqIyhlh6sDgbDtGnMtzYlay4Hn/Fvo03m4ph7Sa\nUYgO2SfQj9Lj/4giTp9kxtxb7QKBgQDVS/nchYl2cdAHS7mxyDI7FGCjmdgpjAYG\n/JgJ0OghfR4QqgnSfI7Rfy0xiZ+5jKwid8lMBDrAUqngmEiK85EQUEzeb64aJ5Ee\nKeStnqEwSggd9t6Mt5l0PmsDYmBRK3BUx+dab3udOfB3eXfQ0t50Z9O28wJnJDhN\nv/LTyMCXNwKBgQDhRy+JRNNRP5/GBPC/3gAzk0rAyn8w3YQVhnh4xHFj5TW/Ozik\nRUMRhRa/xQPaJ6aYg3B54PcMbEkqu6vHoP6t0qPSVZlXRAVZaUD8+3SW2cMz0KLc\nUd2idkJrb0dzItnWk7RbAOu9OleEtQtIBSRoVB9XeXQcDMZpIKnwbkD6PQKBgQC8\nt9ElxNzf+EkH+38cBjYzQY9TkO3JrMM0cU8P+E86OhpcwiWYn245e51/4/V3VTiD\n8poe8OsOeNUnC3W7w08JMRMiB4vyRinGl2hmGSEiuY2+/UrhFBzo1cUXJHZ1uspT\nqN9Qi6zCap4RB170W25JbgfLKe1pVomeeQOfUFLeNwKBgETLtMuoJvsqLoqlXgya\nQ93HRKrlLAcp9m60yYKXwlL6dMslMojsNDdc7z06Lm+uPXjZ6/sg1Bvpg2aj+Xup\nrNM7L2uDpJwt5dei6erxiJff1Z8E2SUmefUXDEnBQpmjUpRxMznahu0sI/VdeTTJ\nDQ7iYRb2NEOsiXlUvWMPoQ6V\n-----END PRIVATE KEY-----\n'
  const host = process.env.CLOUDFRONT_DOMAIN!
  const tobeSigned = `https://${host}/*`
  const signedCookies = getSignedCookies(tobeSigned, privateKey)
  return signedCookies

  /**
   * Construct the url as shown below and access your resource
   * https://${host}/{resource}?Key-Pair-Id={CloudFront-Key-Pair-Id}&Signature={CloudFront-Signature}&Policy={CloudFront-Policy}
   */
}


/**
 *
 * NOTE: We create a custom solution as these packages @aws-sdk/cloudfront-signer, @aws-sdk/client-cloudfront do not support 'getSignedCookies' with custom wildcard access policy.
 *
 * SOLUTION:
 * 1. We first define a message that we want to sign. In our case that message is cloudfront access policy.
 * 2. We make sure there are no white spaces in the policy.
 * 3. We then create a sign object using the crypto.createSign() method, passing in the algorithm we want to use for the signature. In this case, we are using the RSA-SHA1 algorithm.
 * 4. We then update the sign object with the message we want to sign using the sign.update() method.
 * 5. We then use the sign.sign() method to sign the message using the private key.
 * 6. In the end we return base64 encoded policy, signature and the public key id. We also make sure that all the encoded messages have URL-safe characters specified by Amazon.
 */
function getSignedCookies(pathURL: string, privKey: string) {

  // Replace unsupported chars: '+=/' with '-_~'
  function replaceUnsupportedCharacters(message: string) {
    const toReplace: any = {
      '+': '-',
      '=': '_',
      '/': '~'
    }
    for (const key in toReplace) {
      while (message.indexOf(key) !== -1) {
        message = message.replace(key, toReplace[key])
      }
    }
    return message
  }

  const expiration = Math.floor(new Date(new Date().getTime() + (3600 * 1000 * 6)).getTime() / 1000) // expires in 6 hours
  // Generate no-whitespace json policy
  const policy = `{"Statement":[{"Resource":"${pathURL}","Condition":{"DateLessThan":{"AWS:EpochTime":${expiration}}}}]}`
  const policyB64 = Buffer.from(policy).toString('base64')
  let sign = createSign('RSA-SHA1')
  sign.update(policy)
  const signature = sign.sign(privKey, 'base64')
  return {
    credentials: {
      'CloudFront-Policy': replaceUnsupportedCharacters(policyB64),
      'CloudFront-Key-Pair-Id': process.env.CLOUDFRONT_KEY_ID!,
      'CloudFront-Signature': replaceUnsupportedCharacters(signature)
    },
    expiration
  }
}
