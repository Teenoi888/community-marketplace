// react-native-webrtc throws at import time when its native module isn't
// linked (always true in Expo Go, and true in any dev/prod build until a
// custom native build is made). expo-router eagerly requires every file
// under app/ to build its route table, so a bare top-level `import ... from
// "react-native-webrtc"` in a screen file would crash the ENTIRE app on
// launch, not just that screen — hence the guarded require() here.
let webrtc: typeof import("react-native-webrtc") | null = null
try {
  webrtc = require("react-native-webrtc")
} catch {
  webrtc = null
}

export const isWebRTCAvailable = webrtc !== null
export const RTCPeerConnection = webrtc?.RTCPeerConnection
export const RTCSessionDescription = webrtc?.RTCSessionDescription
export const RTCIceCandidate = webrtc?.RTCIceCandidate
export const RTCView = webrtc?.RTCView
export const mediaDevices = webrtc?.mediaDevices
export type MediaStream = import("react-native-webrtc").MediaStream
