/**
 * Workaround: firebase-tools + node-fetch@2 falha no exchange OAuth com Node 19+
 * (erro "Unable to authenticate using the provided code" / Premature close).
 * @see https://github.com/firebase/firebase-tools/issues/8304
 */
require('http').globalAgent.keepAlive = false
require('https').globalAgent.keepAlive = false
