/* M4L v93.7.3 · single-image upload and recorder prompt update
   Embedded MP4 compatibility helper retained unchanged. */
(()=>{/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */function p(t){if(!t)throw new Error("Assertion failed.")}var ht=t=>{let e=(t%360+360)%360;if(e===0||e===90||e===180||e===270)return e;throw new Error(`Invalid rotation ${t}.`)},X=t=>t&&t[t.length-1],Le=t=>t>=0&&t<2**32,C=t=>{let e=0;for(;t.readBits(1)===0&&e<32;)e++;if(e>=32)throw new Error("Invalid exponential-Golomb code.");return(1<<e)-1+t.readBits(e)},Re=t=>{let e=C(t);return(e&1)===0?-(e>>1):e+1>>1};var ie=t=>t.constructor===Uint8Array?t:ArrayBuffer.isView(t)?new Uint8Array(t.buffer,t.byteOffset,t.byteLength):new Uint8Array(t),L=t=>t.constructor===DataView?t:ArrayBuffer.isView(t)?new DataView(t.buffer,t.byteOffset,t.byteLength):new DataView(t),it=new TextDecoder,Ae=new TextEncoder;var Ei=t=>Object.fromEntries(Object.entries(t).map(([e,r])=>[r,e])),We={bt709:1,bt470bg:5,smpte170m:6,bt2020:9,smpte432:12},Bn=Ei(We),Ne={bt709:1,smpte170m:6,linear:8,"iec61966-2-1":13,pq:16,hlg:18},Rn=Ei(Ne),He={rgb:0,bt709:1,bt470bg:5,smpte170m:6,"bt2020-ncl":9},Fn=Ei(He),Mn=t=>!!t&&!!t.primaries&&!!t.transfer&&!!t.matrix&&t.fullRange!==void 0,Ft=t=>t instanceof ArrayBuffer||typeof SharedArrayBuffer<"u"&&t instanceof SharedArrayBuffer||ArrayBuffer.isView(t),Rt=class{constructor(){this.currentPromise=Promise.resolve(),this.pending=0}async acquire(){let e,r=new Promise(s=>{let o=!1;e=()=>{o||(s(),this.pending--,o=!0)}}),i=this.currentPromise;return this.currentPromise=r,this.pending++,await i,e}},zn=/^[0-9a-fA-F]+$/,nt=t=>[...t].map(e=>e.toString(16).padStart(2,"0")).join(""),On=t=>{p(t.length%2===0);let e=new Uint8Array(t.length/2);for(let r=0;r<t.length;r+=2)e[r/2]=parseInt(t.slice(r,r+2),16);return e},vi=t=>(t=t>>1&1431655765|(t&1431655765)<<1,t=t>>2&858993459|(t&858993459)<<2,t=t>>4&252645135|(t&252645135)<<4,t=t>>8&16711935|(t&16711935)<<8,t=t>>16&65535|(t&65535)<<16,t>>>0),Ii=(t,e,r)=>{let i=0,s=t.length-1,o=-1;for(;i<=s;){let n=i+s>>1,a=r(t[n]);a===e?(o=n,s=n-1):a<e?i=n+1:s=n-1}return o},Q=(t,e,r)=>{let i=0,s=t.length-1,o=-1;for(;i<=s;){let n=i+(s-i+1)/2|0;r(t[n])<=e?(o=n,i=n+1):s=n-1}return o},Pi=(t,e,r)=>{let i=Q(t,r(e),r);t.splice(i+1,0,e)},Y=()=>{let t,e;return{promise:new Promise((i,s)=>{t=i,e=s}),resolve:t,reject:e}},tr=(t,e)=>{let r=t.indexOf(e);r!==-1&&t.splice(r,1)};var Dn=(t,e)=>{for(let r=t.length-1;r>=0;r--)if(e(t[r]))return r;return-1},Vn=async function*(t){Symbol.iterator in t?yield*t[Symbol.iterator]():yield*t[Symbol.asyncIterator]()},Un=t=>{if(!(Symbol.iterator in t)&&!(Symbol.asyncIterator in t))throw new TypeError("Argument must be an iterable or async iterable.")},ae=t=>{throw new Error(`Unexpected value: ${t}`)},mt=(t,e,r)=>{let i=t.getUint8(e),s=t.getUint8(e+1),o=t.getUint8(e+2);return r?i|s<<8|o<<16:i<<16|s<<8|o},Ln=(t,e,r)=>mt(t,e,r)<<8>>8,rr=(t,e,r,i)=>{r=r>>>0,r=r&16777215,i?(t.setUint8(e,r&255),t.setUint8(e+1,r>>>8&255),t.setUint8(e+2,r>>>16&255)):(t.setUint8(e,r>>>16&255),t.setUint8(e+1,r>>>8&255),t.setUint8(e+2,r&255))},Wn=(t,e,r,i)=>{r=K(r,-8388608,8388607),r<0&&(r=r+16777216&16777215),rr(t,e,r,i)};var K=(t,e,r)=>Math.max(e,Math.min(r,t)),ir="und",Nn=t=>{let e=Math.round(t);return Math.abs(t/e-1)<10*Number.EPSILON?e:t},nr=(t,e)=>Math.round(t/e)*e,sr=(t,e)=>Math.round(t*e)/e;var Bi=(t,e)=>Math.floor(t*e)/e;var Uo=/^[a-z]{3}$/,pt=t=>Uo.test(t),Fe=1e6*(1+Number.EPSILON);var Hn=(t,e)=>{let r=t<0?-1:1;t=Math.abs(t);let i=0,s=1,o=1,n=0,a=t;for(;;){let c=Math.floor(a),l=c*o+i,u=c*n+s;if(u>e)return{num:r*o,den:n};if(i=o,s=n,o=l,n=u,a=1/(a-c),!isFinite(a))break}return{num:r*o,den:n}},rt=class{constructor(){this.currentPromise=Promise.resolve()}call(e){return this.currentPromise=this.currentPromise.then(e)}},_i=null,st=()=>_i!==null?_i:_i=!!(typeof navigator<"u"&&(navigator.vendor?.match(/apple/i)||/AppleWebKit/.test(navigator.userAgent)&&!/Chrome/.test(navigator.userAgent)||/\b(iPad|iPhone|iPod)\b/.test(navigator.userAgent))),Si=null,or=()=>Si!==null?Si:Si=typeof navigator<"u"&&navigator.userAgent?.includes("Firefox"),ki=null,ar=()=>ki!==null?ki:ki=!!(typeof navigator<"u"&&(navigator.vendor?.includes("Google Inc")||/Chrome/.test(navigator.userAgent))),Ci=null,qn=()=>{if(Ci!==null)return Ci;if(typeof navigator>"u")return null;let t=/\bChrome\/(\d+)/.exec(navigator.userAgent);return t?Ci=Number(t[1]):null};var Pr=(t,e,r,i)=>t<=i&&r<=e,Br=function*(t){for(let e in t){let r=t[e];r!==void 0&&(yield{key:e,value:r})}};var jn=(t,e)=>{if(t.length!==e.length)return!1;for(let r=0;r<t.length;r++)if(t[r]!==e[r])return!1;return!0},Mt=()=>{Symbol.dispose??=Symbol("Symbol.dispose")},Rr=t=>typeof t=="number"&&!Number.isNaN(t);var Qn=(t,e)=>{let r=0;for(let i=0;i<t.length;i++)e(t[i])&&r++;return r},Fr=(t,e)=>{let r=-1,i=1/0;for(let s=0;s<t.length;s++){let o=e(t[s]);o<i&&(i=o,r=s)}return r};var gt=t=>{p(Number.isInteger(t.num)),p(Number.isInteger(t.den)),p(t.den!==0);let e=Math.abs(t.num),r=Math.abs(t.den);for(;r!==0;){let s=e%r;e=r,r=s}let i=e||1;return{num:t.num/i,den:t.den/i}},Ri=(t,e)=>{if(typeof t!="object"||!t)throw new TypeError(`${e} must be an object.`);if(!Number.isInteger(t.left)||t.left<0)throw new TypeError(`${e}.left must be a non-negative integer.`);if(!Number.isInteger(t.top)||t.top<0)throw new TypeError(`${e}.top must be a non-negative integer.`);if(!Number.isInteger(t.width)||t.width<0)throw new TypeError(`${e}.width must be a non-negative integer.`);if(!Number.isInteger(t.height)||t.height<0)throw new TypeError(`${e}.height must be a non-negative integer.`)};var Fi=t=>new Promise(e=>setTimeout(e,t));var Mi=t=>Array.isArray(t)?t:[t],be=class{constructor(){this._listeners=new Map}on(e,r,i){this._listeners.has(e)||this._listeners.set(e,new Set);let s={fn:r,once:i?.once??!1};return this._listeners.get(e).add(s),()=>{this._listeners.get(e)?.delete(s)}}_emit(...e){let[r,i]=e,s=this._listeners.get(r);if(s)for(let o of s){try{o.fn(i)}catch(n){console.error(n)}o.once&&s.delete(o)}}},wt=t=>Math.ceil(t/2)*2;var Kn=t=>t!==null&&typeof t=="object"&&Object.getPrototypeOf(t)===Object.prototype&&Object.values(t).every(e=>typeof e=="string");/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var Me;(function(t){t[t.Silent=0]="Silent",t[t.Errors=1]="Errors",t[t.Warnings=2]="Warnings",t[t.Info=3]="Info"})(Me||(Me={}));var M=class t{constructor(){}static get level(){return t._level}static set level(e){if(e!==Me.Silent&&e!==Me.Errors&&e!==Me.Warnings&&e!==Me.Info)throw new TypeError("Invalid log level. Use one of the values of the LogLevel enum.");t._level=e}static get _emitter(){return t._emitterInstance??=new be}static on(e,r,i){return t._emitter.on(e,r,i)}static _error(...e){t._emitter._emit("error",e),t._level>=Me.Errors&&console.error(...e)}static _warn(...e){t._emitter._emit("warn",e),t._level>=Me.Warnings&&console.warn(...e)}static _info(...e){t._emitter._emit("info",e),t._level>=Me.Info&&console.info(...e)}};M._level=Me.Info;M._emitterInstance=null;/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var ke=class{constructor(e,r){if(this.data=e,this.mimeType=r,!(e instanceof Uint8Array))throw new TypeError("data must be a Uint8Array.");if(typeof r!="string")throw new TypeError("mimeType must be a string.")}},zi=class{constructor(e,r,i,s){if(this.data=e,this.mimeType=r,this.name=i,this.description=s,!(e instanceof Uint8Array))throw new TypeError("data must be a Uint8Array.");if(r!==void 0&&typeof r!="string")throw new TypeError("mimeType, when provided, must be a string.");if(i!==void 0&&typeof i!="string")throw new TypeError("name, when provided, must be a string.");if(s!==void 0&&typeof s!="string")throw new TypeError("description, when provided, must be a string.")}},cr=t=>{if(!t||typeof t!="object")throw new TypeError("tags must be an object.");if(t.title!==void 0&&typeof t.title!="string")throw new TypeError("tags.title, when provided, must be a string.");if(t.description!==void 0&&typeof t.description!="string")throw new TypeError("tags.description, when provided, must be a string.");if(t.artist!==void 0&&typeof t.artist!="string")throw new TypeError("tags.artist, when provided, must be a string.");if(t.album!==void 0&&typeof t.album!="string")throw new TypeError("tags.album, when provided, must be a string.");if(t.albumArtist!==void 0&&typeof t.albumArtist!="string")throw new TypeError("tags.albumArtist, when provided, must be a string.");if(t.trackNumber!==void 0&&(!Number.isInteger(t.trackNumber)||t.trackNumber<=0))throw new TypeError("tags.trackNumber, when provided, must be a positive integer.");if(t.tracksTotal!==void 0&&(!Number.isInteger(t.tracksTotal)||t.tracksTotal<=0))throw new TypeError("tags.tracksTotal, when provided, must be a positive integer.");if(t.discNumber!==void 0&&(!Number.isInteger(t.discNumber)||t.discNumber<=0))throw new TypeError("tags.discNumber, when provided, must be a positive integer.");if(t.discsTotal!==void 0&&(!Number.isInteger(t.discsTotal)||t.discsTotal<=0))throw new TypeError("tags.discsTotal, when provided, must be a positive integer.");if(t.genre!==void 0&&typeof t.genre!="string")throw new TypeError("tags.genre, when provided, must be a string.");if(t.date!==void 0&&(!(t.date instanceof Date)||Number.isNaN(t.date.getTime())))throw new TypeError("tags.date, when provided, must be a valid Date.");if(t.lyrics!==void 0&&typeof t.lyrics!="string")throw new TypeError("tags.lyrics, when provided, must be a string.");if(t.images!==void 0){if(!Array.isArray(t.images))throw new TypeError("tags.images, when provided, must be an array.");for(let e of t.images){if(!e||typeof e!="object")throw new TypeError("Each image in tags.images must be an object.");if(!(e.data instanceof Uint8Array))throw new TypeError("Each image.data must be a Uint8Array.");if(typeof e.mimeType!="string")throw new TypeError("Each image.mimeType must be a string.");if(!["coverFront","coverBack","unknown"].includes(e.kind))throw new TypeError("Each image.kind must be 'coverFront', 'coverBack', or 'unknown'.")}}if(t.comment!==void 0&&typeof t.comment!="string")throw new TypeError("tags.comment, when provided, must be a string.");if(t.raw!==void 0){if(!t.raw||typeof t.raw!="object")throw new TypeError("tags.raw, when provided, must be an object.");for(let e of Object.values(t.raw))if(e!==null&&typeof e!="string"&&!(e instanceof Uint8Array)&&!(e instanceof ke)&&!(e instanceof zi)&&!Kn(e))throw new TypeError("Each value in tags.raw must be a string, Uint8Array, RichImageData, AttachedFile, Record<string, string>, or null.")}};var Gn={default:!0,primary:!0,forced:!1,original:!1,commentary:!1,hearingImpaired:!1,visuallyImpaired:!1},$n=t=>{if(!t||typeof t!="object")throw new TypeError("disposition must be an object.");if(t.default!==void 0&&typeof t.default!="boolean")throw new TypeError("disposition.default must be a boolean.");if(t.primary!==void 0&&typeof t.primary!="boolean")throw new TypeError("disposition.primary must be a boolean.");if(t.forced!==void 0&&typeof t.forced!="boolean")throw new TypeError("disposition.forced must be a boolean.");if(t.original!==void 0&&typeof t.original!="boolean")throw new TypeError("disposition.original must be a boolean.");if(t.commentary!==void 0&&typeof t.commentary!="boolean")throw new TypeError("disposition.commentary must be a boolean.");if(t.hearingImpaired!==void 0&&typeof t.hearingImpaired!="boolean")throw new TypeError("disposition.hearingImpaired must be a boolean.");if(t.visuallyImpaired!==void 0&&typeof t.visuallyImpaired!="boolean")throw new TypeError("disposition.visuallyImpaired must be a boolean.")};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var H=class t{constructor(e){this.bytes=e,this.pos=0}seekToByte(e){this.pos=8*e}readBit(){let e=Math.floor(this.pos/8),r=this.bytes[e]??0,i=7-(this.pos&7),s=(r&1<<i)>>i;return this.pos++,s}readBits(e){if(e===1)return this.readBit();let r=0;for(let i=0;i<e;i++)r<<=1,r|=this.readBit();return r}writeBits(e,r){let i=this.pos+e;for(let s=this.pos;s<i;s++){let o=Math.floor(s/8),n=this.bytes[o],a=7-(s&7);n&=~(1<<a),n|=(r&1<<i-s-1)>>i-s-1<<a,this.bytes[o]=n}this.pos=i}readAlignedByte(){if(this.pos%8!==0)throw new Error("Bitstream is not byte-aligned.");let e=this.pos/8,r=this.bytes[e]??0;return this.pos+=8,r}skipBits(e){this.pos+=e}getBitsLeft(){return this.bytes.length*8-this.pos}clone(){let e=new t(this.bytes);return e.pos=this.pos,e}};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var ur=[96e3,88200,64e3,48e3,44100,32e3,24e3,22050,16e3,12e3,11025,8e3,7350],Mr=[-1,1,2,3,4,5,6,8],zt=t=>{if(!t||t.byteLength<2)throw new TypeError("AAC description must be at least 2 bytes long.");let e=new H(t),r=e.readBits(5);r===31&&(r=32+e.readBits(6));let i=e.readBits(4),s=null;i===15?s=e.readBits(24):i<ur.length&&(s=ur[i]);let o=e.readBits(4),n=null;return o>=1&&o<=7&&(n=Mr[o]),{objectType:r,frequencyIndex:i,sampleRate:s,channelConfiguration:o,numberOfChannels:n}},zr=t=>{let e=ur.indexOf(t.sampleRate),r=null;e===-1&&(e=15,r=t.sampleRate);let i=Mr.indexOf(t.numberOfChannels);if(i===-1)throw new TypeError(`Unsupported number of channels: ${t.numberOfChannels}`);let s=13;t.objectType>=32&&(s+=6),e===15&&(s+=24);let o=Math.ceil(s/8),n=new Uint8Array(o),a=new H(n);return t.objectType<32?a.writeBits(5,t.objectType):(a.writeBits(5,31),a.writeBits(6,t.objectType-32)),a.writeBits(4,e),e===15&&a.writeBits(24,r),a.writeBits(4,i),n};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var le=["avc","hevc","vp9","av1","vp8","prores"],te=["pcm-s16","pcm-s16be","pcm-s24","pcm-s24be","pcm-s32","pcm-s32be","pcm-f32","pcm-f32be","pcm-f64","pcm-f64be","pcm-u8","pcm-s8","ulaw","alaw"],ot=["aac","opus","mp3","vorbis","flac","ac3","eac3"],he=[...ot,...te],at=["webvtt"],lr=[{maxMacroblocks:99,maxBitrate:64e3,maxDpbMbs:396,level:10},{maxMacroblocks:396,maxBitrate:192e3,maxDpbMbs:900,level:11},{maxMacroblocks:396,maxBitrate:384e3,maxDpbMbs:2376,level:12},{maxMacroblocks:396,maxBitrate:768e3,maxDpbMbs:2376,level:13},{maxMacroblocks:396,maxBitrate:2e6,maxDpbMbs:2376,level:20},{maxMacroblocks:792,maxBitrate:4e6,maxDpbMbs:4752,level:21},{maxMacroblocks:1620,maxBitrate:4e6,maxDpbMbs:8100,level:22},{maxMacroblocks:1620,maxBitrate:1e7,maxDpbMbs:8100,level:30},{maxMacroblocks:3600,maxBitrate:14e6,maxDpbMbs:18e3,level:31},{maxMacroblocks:5120,maxBitrate:2e7,maxDpbMbs:20480,level:32},{maxMacroblocks:8192,maxBitrate:2e7,maxDpbMbs:32768,level:40},{maxMacroblocks:8192,maxBitrate:5e7,maxDpbMbs:32768,level:41},{maxMacroblocks:8704,maxBitrate:5e7,maxDpbMbs:34816,level:42},{maxMacroblocks:22080,maxBitrate:135e6,maxDpbMbs:110400,level:50},{maxMacroblocks:36864,maxBitrate:24e7,maxDpbMbs:184320,level:51},{maxMacroblocks:36864,maxBitrate:24e7,maxDpbMbs:184320,level:52},{maxMacroblocks:139264,maxBitrate:24e7,maxDpbMbs:696320,level:60},{maxMacroblocks:139264,maxBitrate:48e7,maxDpbMbs:696320,level:61},{maxMacroblocks:139264,maxBitrate:8e8,maxDpbMbs:696320,level:62}],Xn=[{maxPictureSize:36864,maxBitrate:128e3,tier:"L",level:30},{maxPictureSize:122880,maxBitrate:15e5,tier:"L",level:60},{maxPictureSize:245760,maxBitrate:3e6,tier:"L",level:63},{maxPictureSize:552960,maxBitrate:6e6,tier:"L",level:90},{maxPictureSize:983040,maxBitrate:1e7,tier:"L",level:93},{maxPictureSize:2228224,maxBitrate:12e6,tier:"L",level:120},{maxPictureSize:2228224,maxBitrate:3e7,tier:"H",level:120},{maxPictureSize:2228224,maxBitrate:2e7,tier:"L",level:123},{maxPictureSize:2228224,maxBitrate:5e7,tier:"H",level:123},{maxPictureSize:8912896,maxBitrate:25e6,tier:"L",level:150},{maxPictureSize:8912896,maxBitrate:1e8,tier:"H",level:150},{maxPictureSize:8912896,maxBitrate:4e7,tier:"L",level:153},{maxPictureSize:8912896,maxBitrate:16e7,tier:"H",level:153},{maxPictureSize:8912896,maxBitrate:6e7,tier:"L",level:156},{maxPictureSize:8912896,maxBitrate:24e7,tier:"H",level:156},{maxPictureSize:35651584,maxBitrate:6e7,tier:"L",level:180},{maxPictureSize:35651584,maxBitrate:24e7,tier:"H",level:180},{maxPictureSize:35651584,maxBitrate:12e7,tier:"L",level:183},{maxPictureSize:35651584,maxBitrate:48e7,tier:"H",level:183},{maxPictureSize:35651584,maxBitrate:24e7,tier:"L",level:186},{maxPictureSize:35651584,maxBitrate:8e8,tier:"H",level:186}],qe=[{maxPictureSize:36864,maxBitrate:2e5,level:10},{maxPictureSize:73728,maxBitrate:8e5,level:11},{maxPictureSize:122880,maxBitrate:18e5,level:20},{maxPictureSize:245760,maxBitrate:36e5,level:21},{maxPictureSize:552960,maxBitrate:72e5,level:30},{maxPictureSize:983040,maxBitrate:12e6,level:31},{maxPictureSize:2228224,maxBitrate:18e6,level:40},{maxPictureSize:2228224,maxBitrate:3e7,level:41},{maxPictureSize:8912896,maxBitrate:6e7,level:50},{maxPictureSize:8912896,maxBitrate:12e7,level:51},{maxPictureSize:8912896,maxBitrate:18e7,level:52},{maxPictureSize:35651584,maxBitrate:18e7,level:60},{maxPictureSize:35651584,maxBitrate:24e7,level:61},{maxPictureSize:35651584,maxBitrate:48e7,level:62}],Yn=[{maxPictureSize:147456,maxBitrate:15e5,tier:"M",level:0},{maxPictureSize:278784,maxBitrate:3e6,tier:"M",level:1},{maxPictureSize:665856,maxBitrate:6e6,tier:"M",level:4},{maxPictureSize:1065024,maxBitrate:1e7,tier:"M",level:5},{maxPictureSize:2359296,maxBitrate:12e6,tier:"M",level:8},{maxPictureSize:2359296,maxBitrate:3e7,tier:"H",level:8},{maxPictureSize:2359296,maxBitrate:2e7,tier:"M",level:9},{maxPictureSize:2359296,maxBitrate:5e7,tier:"H",level:9},{maxPictureSize:8912896,maxBitrate:3e7,tier:"M",level:12},{maxPictureSize:8912896,maxBitrate:1e8,tier:"H",level:12},{maxPictureSize:8912896,maxBitrate:4e7,tier:"M",level:13},{maxPictureSize:8912896,maxBitrate:16e7,tier:"H",level:13},{maxPictureSize:8912896,maxBitrate:6e7,tier:"M",level:14},{maxPictureSize:8912896,maxBitrate:24e7,tier:"H",level:14},{maxPictureSize:35651584,maxBitrate:6e7,tier:"M",level:15},{maxPictureSize:35651584,maxBitrate:24e7,tier:"H",level:15},{maxPictureSize:35651584,maxBitrate:6e7,tier:"M",level:16},{maxPictureSize:35651584,maxBitrate:24e7,tier:"H",level:16},{maxPictureSize:35651584,maxBitrate:1e8,tier:"M",level:17},{maxPictureSize:35651584,maxBitrate:48e7,tier:"H",level:17},{maxPictureSize:35651584,maxBitrate:16e7,tier:"M",level:18},{maxPictureSize:35651584,maxBitrate:8e8,tier:"H",level:18},{maxPictureSize:35651584,maxBitrate:16e7,tier:"M",level:19},{maxPictureSize:35651584,maxBitrate:8e8,tier:"H",level:19}],Zn=".01.01.01.01.00",Jn=".0.110.01.01.01.0",yt=["ap4x","ap4h","apch","apcn","apcs","apco"],Wo=[{fourCc:"apco",bitrate:45e6,alpha:!1},{fourCc:"apcs",bitrate:102e6,alpha:!1},{fourCc:"apcn",bitrate:147e6,alpha:!1},{fourCc:"apch",bitrate:22e7,alpha:!1},{fourCc:"ap4h",bitrate:33e7,alpha:!0},{fourCc:"ap4x",bitrate:5e8,alpha:!0}],es=(t,e,r,i,s)=>{if(t==="avc"){let n=Math.ceil(e/16)*Math.ceil(r/16),a=lr.find(f=>n<=f.maxMacroblocks&&i<=f.maxBitrate)??X(lr),c=a?a.level:0,l="64".padStart(2,"0"),u="00",d=c.toString(16).padStart(2,"0");return`avc1.${l}${u}${d}`}else if(t==="hevc"){let c=e*r,l=Xn.find(d=>c<=d.maxPictureSize&&i<=d.maxBitrate)??X(Xn);return`hev1.1.6.${l.tier}${l.level}.B0`}else{if(t==="vp8")return"vp8";if(t==="vp9"){let n=e*r;return`vp09.00.${(qe.find(l=>n<=l.maxPictureSize&&i<=l.maxBitrate)??X(qe)).level.toString().padStart(2,"0")}.08`}else if(t==="av1"){let n=e*r,a=Yn.find(u=>n<=u.maxPictureSize&&i<=u.maxBitrate)??X(Yn);return`av01.0.${a.level.toString().padStart(2,"0")}${a.tier}.08`}else if(t==="prores"){let n=Math.pow(e*r/2073600,.95),a=Wo.filter(u=>u.alpha===s),c=a[0].fourCc,l=1/0;for(let{fourCc:u,bitrate:d}of a){let f=Math.abs(d*n-i);f<l&&(l=f,c=u)}return c}else ae(t)}throw new TypeError(`Unhandled codec '${String(t)}'.`)};var ts=t=>{let e=t.split("."),s=(1<<7)+1,o=Number(e[1]),n=e[2],a=Number(n.slice(0,-1)),c=(o<<5)+a,l=n.slice(-1)==="H"?1:0,d=Number(e[3])===8?0:1,f=0,h=e[4]?Number(e[4]):0,m=e[5]?Number(e[5][0]):1,g=e[5]?Number(e[5][1]):1,w=e[5]?Number(e[5][2]):0,y=(l<<7)+(d<<6)+(f<<5)+(h<<4)+(m<<3)+(g<<2)+w;return[s,c,y,0]},rs=t=>{let{codec:e,codecDescription:r,colorSpace:i,avcCodecInfo:s,hevcCodecInfo:o,vp9CodecInfo:n,av1CodecInfo:a,proresFormat:c}=t;if(e==="avc"){if(p(t.avcType!==null),s){let l=new Uint8Array([s.avcProfileIndication,s.profileCompatibility,s.avcLevelIndication]);return`avc${t.avcType}.${nt(l)}`}if(!r||r.byteLength<4)throw new TypeError("AVC decoder description is not provided or is not at least 4 bytes long.");return`avc${t.avcType}.${nt(r.subarray(1,4))}`}else if(e==="hevc"){let l,u,d,f,h,m;if(o)l=o.generalProfileSpace,u=o.generalProfileIdc,d=vi(o.generalProfileCompatibilityFlags),f=o.generalTierFlag,h=o.generalLevelIdc,m=[...o.generalConstraintIndicatorFlags];else{if(!r||r.byteLength<23)throw new TypeError("HEVC decoder description is not provided or is not at least 23 bytes long.");let w=L(r),y=w.getUint8(1);l=y>>6&3,u=y&31,d=vi(w.getUint32(2)),f=y>>5&1,h=w.getUint8(12),m=[];for(let b=0;b<6;b++)m.push(w.getUint8(6+b))}let g="hev1.";for(g+=["","A","B","C"][l]+u,g+=".",g+=d.toString(16).toUpperCase(),g+=".",g+=f===0?"L":"H",g+=h;m.length>0&&m[m.length-1]===0;)m.pop();return m.length>0&&(g+=".",g+=m.map(w=>w.toString(16).toUpperCase()).join(".")),g}else{if(e==="vp8")return"vp8";if(e==="vp9"){if(!n){let b=t.width*t.height,A=X(qe).level;for(let S of qe)if(b<=S.maxPictureSize){A=S.level;break}return`vp09.00.${A.toString().padStart(2,"0")}.08`}let l=n.profile.toString().padStart(2,"0"),u=n.level.toString().padStart(2,"0"),d=n.bitDepth.toString().padStart(2,"0"),f=n.chromaSubsampling.toString().padStart(2,"0"),h=n.colourPrimaries.toString().padStart(2,"0"),m=n.transferCharacteristics.toString().padStart(2,"0"),g=n.matrixCoefficients.toString().padStart(2,"0"),w=n.videoFullRangeFlag.toString().padStart(2,"0"),y=`vp09.${l}.${u}.${d}.${f}`;return y+=`.${h}.${m}.${g}.${w}`,y.endsWith(Zn)&&(y=y.slice(0,-Zn.length)),y}else if(e==="av1"){if(!a){let S=t.width*t.height,T=X(qe).level;for(let v of qe)if(S<=v.maxPictureSize){T=v.level;break}return`av01.0.${T.toString().padStart(2,"0")}M.08`}let l=a.profile,u=a.level.toString().padStart(2,"0"),d=a.tier?"H":"M",f=a.bitDepth.toString().padStart(2,"0"),h=a.monochrome?"1":"0",m=100*a.chromaSubsamplingX+10*a.chromaSubsamplingY+1*(a.chromaSubsamplingX&&a.chromaSubsamplingY?a.chromaSamplePosition:0),g=i?.primaries?We[i.primaries]:1,w=i?.transfer?Ne[i.transfer]:1,y=i?.matrix?He[i.matrix]:1,b=i?.fullRange?1:0,A=`av01.${l}.${u}${d}.${f}`;return A+=`.${h}.${m.toString().padStart(3,"0")}`,A+=`.${g.toString().padStart(2,"0")}`,A+=`.${w.toString().padStart(2,"0")}`,A+=`.${y.toString().padStart(2,"0")}`,A+=`.${b}`,A.endsWith(Jn)&&(A=A.slice(0,-Jn.length)),A}else{if(e==="prores")return c??"apch";e!==null&&ae(e)}}throw new TypeError(`Unhandled codec '${e}'.`)},is=(t,e,r)=>{if(t==="aac")return e>=2&&r<=24e3?"mp4a.40.29":r<=24e3?"mp4a.40.5":"mp4a.40.2";if(t==="mp3")return"mp3";if(t==="opus")return"opus";if(t==="vorbis")return"vorbis";if(t==="flac")return"flac";if(t==="ac3")return"ac-3";if(t==="eac3")return"ec-3";if(te.includes(t))return t;throw new TypeError(`Unhandled codec '${t}'.`)},ns=t=>{let{codec:e,codecDescription:r,aacCodecInfo:i}=t;if(e==="aac"){if(!i)throw new TypeError("AAC codec info must be provided.");if(i.isMpeg2)return"mp4a.67";{let s;return i.objectType!==null?s=i.objectType:s=zt(r).objectType,`mp4a.40.${s}`}}else{if(e==="mp3")return"mp3";if(e==="opus")return"opus";if(e==="vorbis")return"vorbis";if(e==="flac")return"flac";if(e==="ac3")return"ac-3";if(e==="eac3")return"ec-3";if(e&&te.includes(e))return e}throw new TypeError(`Unhandled codec '${e}'.`)};var ss=48e3,os=/^pcm-([usf])(\d+)(be)?$/,me=t=>{if(p(te.includes(t)),t==="ulaw")return{dataType:"ulaw",sampleSize:1,littleEndian:!0,silentValue:255};if(t==="alaw")return{dataType:"alaw",sampleSize:1,littleEndian:!0,silentValue:213};let e=os.exec(t);p(e);let r;e[1]==="u"?r="unsigned":e[1]==="s"?r="signed":r="float";let i=Number(e[2])/8,s=e[3]!=="be",o=t==="pcm-u8"?2**7:0;return{dataType:r,sampleSize:i,littleEndian:s,silentValue:o}},Oi=t=>t.startsWith("avc1")||t.startsWith("avc3")?"avc":t.startsWith("hev1")||t.startsWith("hvc1")?"hevc":t==="vp8"?"vp8":t.startsWith("vp09")?"vp9":t.startsWith("av01")?"av1":yt.includes(t)?"prores":t==="mp3"||t==="mp4a.69"||t==="mp4a.6B"||t==="mp4a.6b"||t==="mp4a.40.34"?"mp3":t.startsWith("mp4a.40.")||t==="mp4a.67"?"aac":t==="opus"?"opus":t==="vorbis"?"vorbis":t==="flac"?"flac":t==="ac-3"||t==="ac3"?"ac3":t==="ec-3"||t==="eac3"?"eac3":t==="ulaw"?"ulaw":t==="alaw"?"alaw":os.test(t)?t:t==="webvtt"?"webvtt":null,as=t=>t==="avc"?{avc:{format:"avc"}}:t==="hevc"?{hevc:{format:"hevc"}}:{},cs=t=>t==="aac"?{aac:{format:"aac"}}:t==="opus"?{opus:{format:"opus"}}:{},No=["avc1","avc3","hev1","hvc1","vp8","vp09","av01",...yt],Ho=/^(avc1|avc3)\.[0-9a-fA-F]{6}$/,qo=/^(hev1|hvc1)\.(?:[ABC]?\d+)\.[0-9a-fA-F]{1,8}\.[LH]\d+(?:\.[0-9a-fA-F]{1,2}){0,6}$/,jo=/^vp09(?:\.\d{2}){3}(?:(?:\.\d{2}){5})?$/,Qo=/^av01\.\d\.\d{2}[MH]\.\d{2}(?:\.\d\.\d{3}\.\d{2}\.\d{2}\.\d{2}\.\d)?$/,us=t=>{if(!t)throw new TypeError("Video chunk metadata must be provided.");if(typeof t!="object")throw new TypeError("Video chunk metadata must be an object.");if(!t.decoderConfig)throw new TypeError("Video chunk metadata must include a decoder configuration.");if(typeof t.decoderConfig!="object")throw new TypeError("Video chunk metadata decoder configuration must be an object.");if(typeof t.decoderConfig.codec!="string")throw new TypeError("Video chunk metadata decoder configuration must specify a codec string.");if(!No.some(e=>t.decoderConfig.codec.startsWith(e)))throw new TypeError("Video chunk metadata decoder configuration codec string must be a valid video codec string as specified in the Mediabunny Codec Registry.");if(!Number.isInteger(t.decoderConfig.codedWidth)||t.decoderConfig.codedWidth<=0)throw new TypeError("Video chunk metadata decoder configuration must specify a valid codedWidth (positive integer).");if(!Number.isInteger(t.decoderConfig.codedHeight)||t.decoderConfig.codedHeight<=0)throw new TypeError("Video chunk metadata decoder configuration must specify a valid codedHeight (positive integer).");if(t.decoderConfig.displayAspectWidth!==void 0&&(!Number.isInteger(t.decoderConfig.displayAspectWidth)||t.decoderConfig.displayAspectWidth<=0))throw new TypeError("Video chunk metadata decoder configuration displayAspectWidth, when defined, must be a positive integer.");if(t.decoderConfig.displayAspectHeight!==void 0&&(!Number.isInteger(t.decoderConfig.displayAspectHeight)||t.decoderConfig.displayAspectHeight<=0))throw new TypeError("Video chunk metadata decoder configuration displayAspectHeight, when defined, must be a positive integer.");if(t.decoderConfig.displayAspectWidth!==void 0!=(t.decoderConfig.displayAspectHeight!==void 0))throw new TypeError("Video chunk metadata decoder configuration must specify both displayAspectWidth and displayAspectHeight, or neither.");if(t.decoderConfig.description!==void 0&&!Ft(t.decoderConfig.description))throw new TypeError("Video chunk metadata decoder configuration description, when defined, must be an ArrayBuffer or an ArrayBuffer view.");if(t.decoderConfig.colorSpace!==void 0){let{colorSpace:e}=t.decoderConfig;if(typeof e!="object")throw new TypeError("Video chunk metadata decoder configuration colorSpace, when provided, must be an object.");let r=Object.keys(We);if(e.primaries!=null&&!r.includes(e.primaries))throw new TypeError(`Video chunk metadata decoder configuration colorSpace primaries, when defined, must be one of ${r.join(", ")}.`);let i=Object.keys(Ne);if(e.transfer!=null&&!i.includes(e.transfer))throw new TypeError(`Video chunk metadata decoder configuration colorSpace transfer, when defined, must be one of ${i.join(", ")}.`);let s=Object.keys(He);if(e.matrix!=null&&!s.includes(e.matrix))throw new TypeError(`Video chunk metadata decoder configuration colorSpace matrix, when defined, must be one of ${s.join(", ")}.`);if(e.fullRange!=null&&typeof e.fullRange!="boolean")throw new TypeError("Video chunk metadata decoder configuration colorSpace fullRange, when defined, must be a boolean.")}if(t.decoderConfig.codec.startsWith("avc1")||t.decoderConfig.codec.startsWith("avc3")){if(!Ho.test(t.decoderConfig.codec))throw new TypeError("Video chunk metadata decoder configuration codec string for AVC must be a valid AVC codec string as specified in Section 3.4 of RFC 6381.")}else if(t.decoderConfig.codec.startsWith("hev1")||t.decoderConfig.codec.startsWith("hvc1")){if(!qo.test(t.decoderConfig.codec))throw new TypeError("Video chunk metadata decoder configuration codec string for HEVC must be a valid HEVC codec string as specified in Section E.3 of ISO 14496-15.")}else if(t.decoderConfig.codec.startsWith("vp8")){if(t.decoderConfig.codec!=="vp8")throw new TypeError('Video chunk metadata decoder configuration codec string for VP8 must be "vp8".')}else if(t.decoderConfig.codec.startsWith("vp09")){if(!jo.test(t.decoderConfig.codec))throw new TypeError('Video chunk metadata decoder configuration codec string for VP9 must be a valid VP9 codec string as specified in Section "Codecs Parameter String" of https://www.webmproject.org/vp9/mp4/.')}else if(t.decoderConfig.codec.startsWith("av01")){if(!Qo.test(t.decoderConfig.codec))throw new TypeError('Video chunk metadata decoder configuration codec string for AV1 must be a valid AV1 codec string as specified in Section "Codecs Parameter String" of https://aomediacodec.github.io/av1-isobmff/.')}else if(yt.some(e=>t.decoderConfig.codec.startsWith(e))&&!yt.some(e=>t.decoderConfig.codec===e))throw new TypeError(`Video chunk metadata decoder configuration codec string for ProRes must be one of the valid ProRes four-character codes: ${yt.join(", ")}.`)},Ko=["mp4a","mp3","opus","vorbis","flac","ulaw","alaw","pcm","ac-3","ec-3"],ls=t=>{if(!t)throw new TypeError("Audio chunk metadata must be provided.");if(typeof t!="object")throw new TypeError("Audio chunk metadata must be an object.");if(!t.decoderConfig)throw new TypeError("Audio chunk metadata must include a decoder configuration.");if(typeof t.decoderConfig!="object")throw new TypeError("Audio chunk metadata decoder configuration must be an object.");if(typeof t.decoderConfig.codec!="string")throw new TypeError("Audio chunk metadata decoder configuration must specify a codec string.");if(!Ko.some(e=>t.decoderConfig.codec.startsWith(e)))throw new TypeError("Audio chunk metadata decoder configuration codec string must be a valid audio codec string as specified in the Mediabunny Codec Registry.");if(!Number.isInteger(t.decoderConfig.sampleRate)||t.decoderConfig.sampleRate<=0)throw new TypeError("Audio chunk metadata decoder configuration must specify a valid sampleRate (positive integer).");if(!Number.isInteger(t.decoderConfig.numberOfChannels)||t.decoderConfig.numberOfChannels<=0)throw new TypeError("Audio chunk metadata decoder configuration must specify a valid numberOfChannels (positive integer).");if(t.decoderConfig.description!==void 0&&!Ft(t.decoderConfig.description))throw new TypeError("Audio chunk metadata decoder configuration description, when defined, must be an ArrayBuffer or an ArrayBuffer view.");if(t.decoderConfig.codec.startsWith("mp4a")&&t.decoderConfig.codec!=="mp4a.69"&&t.decoderConfig.codec!=="mp4a.6B"&&t.decoderConfig.codec!=="mp4a.6b"){if(!["mp4a.40.2","mp4a.40.02","mp4a.40.5","mp4a.40.05","mp4a.40.29","mp4a.67"].includes(t.decoderConfig.codec))throw new TypeError("Audio chunk metadata decoder configuration codec string for AAC must be a valid AAC codec string as specified in https://www.w3.org/TR/webcodecs-aac-codec-registration/.")}else if(t.decoderConfig.codec.startsWith("mp3")||t.decoderConfig.codec.startsWith("mp4a")){if(t.decoderConfig.codec!=="mp3"&&t.decoderConfig.codec!=="mp4a.69"&&t.decoderConfig.codec!=="mp4a.6B"&&t.decoderConfig.codec!=="mp4a.6b")throw new TypeError('Audio chunk metadata decoder configuration codec string for MP3 must be "mp3", "mp4a.69" or "mp4a.6B".')}else if(t.decoderConfig.codec.startsWith("opus")){if(t.decoderConfig.codec!=="opus")throw new TypeError('Audio chunk metadata decoder configuration codec string for Opus must be "opus".');if(t.decoderConfig.description&&t.decoderConfig.description.byteLength<18)throw new TypeError("Audio chunk metadata decoder configuration description, when specified, is expected to be an Identification Header as specified in Section 5.1 of RFC 7845.")}else if(t.decoderConfig.codec.startsWith("vorbis")){if(t.decoderConfig.codec!=="vorbis")throw new TypeError('Audio chunk metadata decoder configuration codec string for Vorbis must be "vorbis".');if(!t.decoderConfig.description)throw new TypeError("Audio chunk metadata decoder configuration for Vorbis must include a description, which is expected to adhere to the format described in https://www.w3.org/TR/webcodecs-vorbis-codec-registration/.")}else if(t.decoderConfig.codec.startsWith("flac")){if(t.decoderConfig.codec!=="flac")throw new TypeError('Audio chunk metadata decoder configuration codec string for FLAC must be "flac".');if(!t.decoderConfig.description||t.decoderConfig.description.byteLength<42)throw new TypeError("Audio chunk metadata decoder configuration for FLAC must include a description, which is expected to adhere to the format described in https://www.w3.org/TR/webcodecs-flac-codec-registration/.")}else if(t.decoderConfig.codec.startsWith("ac-3")||t.decoderConfig.codec.startsWith("ac3")){if(t.decoderConfig.codec!=="ac-3")throw new TypeError('Audio chunk metadata decoder configuration codec string for AC-3 must be "ac-3".')}else if(t.decoderConfig.codec.startsWith("ec-3")||t.decoderConfig.codec.startsWith("eac3")){if(t.decoderConfig.codec!=="ec-3")throw new TypeError('Audio chunk metadata decoder configuration codec string for EC-3 must be "ec-3".')}else if((t.decoderConfig.codec.startsWith("pcm")||t.decoderConfig.codec.startsWith("ulaw")||t.decoderConfig.codec.startsWith("alaw"))&&!te.includes(t.decoderConfig.codec))throw new TypeError(`Audio chunk metadata decoder configuration codec string for PCM must be one of the supported PCM codecs (${te.join(", ")}).`)},ds=t=>{if(!t)throw new TypeError("Subtitle metadata must be provided.");if(typeof t!="object")throw new TypeError("Subtitle metadata must be an object.");if(!t.config)throw new TypeError("Subtitle metadata must include a config object.");if(typeof t.config!="object")throw new TypeError("Subtitle metadata config must be an object.");if(typeof t.config.description!="string")throw new TypeError("Subtitle metadata config description must be a string.")};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var dr=[48e3,44100,32e3],Di=[24e3,22050,16e3];/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var Ce;(function(t){t[t.NON_IDR_SLICE=1]="NON_IDR_SLICE",t[t.SLICE_DPA=2]="SLICE_DPA",t[t.SLICE_DPB=3]="SLICE_DPB",t[t.SLICE_DPC=4]="SLICE_DPC",t[t.IDR=5]="IDR",t[t.SEI=6]="SEI",t[t.SPS=7]="SPS",t[t.PPS=8]="PPS",t[t.AUD=9]="AUD",t[t.SPS_EXT=13]="SPS_EXT"})(Ce||(Ce={}));var de;(function(t){t[t.RASL_N=8]="RASL_N",t[t.RASL_R=9]="RASL_R",t[t.BLA_W_LP=16]="BLA_W_LP",t[t.RSV_IRAP_VCL23=23]="RSV_IRAP_VCL23",t[t.VPS_NUT=32]="VPS_NUT",t[t.SPS_NUT=33]="SPS_NUT",t[t.PPS_NUT=34]="PPS_NUT",t[t.AUD_NUT=35]="AUD_NUT",t[t.PREFIX_SEI_NUT=39]="PREFIX_SEI_NUT",t[t.SUFFIX_SEI_NUT=40]="SUFFIX_SEI_NUT"})(de||(de={}));var Dt=function*(t){let e=0,r=-1;for(;e<t.length-2;){let i=t.indexOf(0,e);if(i===-1||i>=t.length-2)break;e=i;let s=0;if(e+3<t.length&&t[e+1]===0&&t[e+2]===0&&t[e+3]===1?s=4:t[e+1]===0&&t[e+2]===1&&(s=3),s===0){e++;continue}r!==-1&&e>r&&(yield{offset:r,length:e-r}),r=e+s,e=r}r!==-1&&r<t.length&&(yield{offset:r,length:t.length-r})},ms=function*(t,e){let r=0,i=new DataView(t.buffer,t.byteOffset,t.byteLength);for(;r+e<=t.length;){let s;e===1?s=i.getUint8(r):e===2?s=i.getUint16(r,!1):e===3?s=mt(i,r,!1):(p(e===4),s=i.getUint32(r,!1)),r+=e,yield{offset:r,length:s},r+=s}},Ui=(t,e)=>{if(e.description){let s=(ie(e.description)[4]&3)+1;return ms(t,s)}else return Dt(t)},Dr=t=>t&31,Vr=t=>{let e=[],r=t.length;for(let i=0;i<r;i++)i+2<r&&t[i]===0&&t[i+1]===0&&t[i+2]===3?(e.push(0,0),i+=2):e.push(t[i]);return new Uint8Array(e)},Vi=new Uint8Array([0,0,0,1]),ps=t=>{let e=t.reduce((s,o)=>s+Vi.byteLength+o.byteLength,0),r=new Uint8Array(e),i=0;for(let s of t)r.set(Vi,i),i+=Vi.byteLength,r.set(s,i),i+=s.byteLength;return r},Ur=(t,e)=>{let r=t.reduce((o,n)=>o+e+n.byteLength,0),i=new Uint8Array(r),s=0;for(let o of t){let n=new DataView(i.buffer,i.byteOffset,i.byteLength);switch(e){case 1:n.setUint8(s,o.byteLength);break;case 2:n.setUint16(s,o.byteLength,!1);break;case 3:rr(n,s,o.byteLength,!1);break;case 4:n.setUint32(s,o.byteLength,!1);break}s+=e,i.set(o,s),s+=o.byteLength}return i},gs=(t,e)=>{if(e.description){let s=(ie(e.description)[4]&3)+1;return Ur(t,s)}else return ps(t)},ws=t=>{try{let e=[],r=[],i=[];for(let a of Dt(t)){let c=t.subarray(a.offset,a.offset+a.length),l=Dr(c[0]);l===Ce.SPS?e.push(c):l===Ce.PPS?r.push(c):l===Ce.SPS_EXT&&i.push(c)}if(e.length===0||r.length===0)return null;let s=e[0],o=Li(s);p(o!==null);let n=o.profileIdc===100||o.profileIdc===110||o.profileIdc===122||o.profileIdc===144;return{configurationVersion:1,avcProfileIndication:o.profileIdc,profileCompatibility:o.constraintFlags,avcLevelIndication:o.levelIdc,lengthSizeMinusOne:3,sequenceParameterSets:e,pictureParameterSets:r,chromaFormat:n?o.chromaFormatIdc:null,bitDepthLumaMinus8:n?o.bitDepthLumaMinus8:null,bitDepthChromaMinus8:n?o.bitDepthChromaMinus8:null,sequenceParameterSetExt:n?i:null}}catch(e){return M._error("Error building AVC Decoder Configuration Record:",e),null}},ys=t=>{let e=[];e.push(t.configurationVersion),e.push(t.avcProfileIndication),e.push(t.profileCompatibility),e.push(t.avcLevelIndication),e.push(252|t.lengthSizeMinusOne&3),e.push(224|t.sequenceParameterSets.length&31);for(let r of t.sequenceParameterSets){let i=r.byteLength;e.push(i>>8),e.push(i&255);for(let s=0;s<i;s++)e.push(r[s])}e.push(t.pictureParameterSets.length);for(let r of t.pictureParameterSets){let i=r.byteLength;e.push(i>>8),e.push(i&255);for(let s=0;s<i;s++)e.push(r[s])}if(t.avcProfileIndication===100||t.avcProfileIndication===110||t.avcProfileIndication===122||t.avcProfileIndication===144){p(t.chromaFormat!==null),p(t.bitDepthLumaMinus8!==null),p(t.bitDepthChromaMinus8!==null),p(t.sequenceParameterSetExt!==null),e.push(252|t.chromaFormat&3),e.push(248|t.bitDepthLumaMinus8&7),e.push(248|t.bitDepthChromaMinus8&7),e.push(t.sequenceParameterSetExt.length);for(let r of t.sequenceParameterSetExt){let i=r.byteLength;e.push(i>>8),e.push(i&255);for(let s=0;s<i;s++)e.push(r[s])}}return new Uint8Array(e)},bs=t=>{try{let e=L(t),r=0,i=e.getUint8(r++),s=e.getUint8(r++),o=e.getUint8(r++),n=e.getUint8(r++),a=e.getUint8(r++)&3,c=e.getUint8(r++)&31,l=[];for(let h=0;h<c;h++){let m=e.getUint16(r,!1);r+=2,l.push(t.subarray(r,r+m)),r+=m}let u=e.getUint8(r++),d=[];for(let h=0;h<u;h++){let m=e.getUint16(r,!1);r+=2,d.push(t.subarray(r,r+m)),r+=m}let f={configurationVersion:i,avcProfileIndication:s,profileCompatibility:o,avcLevelIndication:n,lengthSizeMinusOne:a,sequenceParameterSets:l,pictureParameterSets:d,chromaFormat:null,bitDepthLumaMinus8:null,bitDepthChromaMinus8:null,sequenceParameterSetExt:null};if((s===100||s===110||s===122||s===144)&&r+4<=t.length){let h=e.getUint8(r++)&3,m=e.getUint8(r++)&7,g=e.getUint8(r++)&7,w=e.getUint8(r++);f.chromaFormat=h,f.bitDepthLumaMinus8=m,f.bitDepthChromaMinus8=g;let y=[];for(let b=0;b<w;b++){let A=e.getUint16(r,!1);r+=2,y.push(t.subarray(r,r+A)),r+=A}f.sequenceParameterSetExt=y}return f}catch(e){return M._error("Error deserializing AVC Decoder Configuration Record:",e),null}},As={1:{num:1,den:1},2:{num:12,den:11},3:{num:10,den:11},4:{num:16,den:11},5:{num:40,den:33},6:{num:24,den:11},7:{num:20,den:11},8:{num:32,den:11},9:{num:80,den:33},10:{num:18,den:11},11:{num:15,den:11},12:{num:64,den:33},13:{num:160,den:99},14:{num:4,den:3},15:{num:3,den:2},16:{num:2,den:1}},Li=t=>{try{let e=new H(Vr(t));if(e.skipBits(1),e.skipBits(2),e.readBits(5)!==7)return null;let i=e.readAlignedByte(),s=e.readAlignedByte(),o=e.readAlignedByte();C(e);let n=1,a=0,c=0,l=0;if((i===100||i===110||i===122||i===244||i===44||i===83||i===86||i===118||i===128)&&(n=C(e),n===3&&(l=e.readBits(1)),a=C(e),c=C(e),e.skipBits(1),e.readBits(1))){for(let z=0;z<(n!==3?8:12);z++)if(e.readBits(1)){let J=z<6?16:64,W=8,$=8;for(let j=0;j<J;j++){if($!==0){let ne=Re(e);$=(W+ne+256)%256}W=$===0?W:$}}}C(e);let u=C(e);if(u===0)C(e);else if(u===1){e.skipBits(1),Re(e),Re(e);let F=C(e);for(let z=0;z<F;z++)Re(e)}C(e),e.skipBits(1);let d=C(e),f=C(e),h=16*(d+1),m=16*(f+1),g=h,w=m,y=e.readBits(1);if(y||e.skipBits(1),e.skipBits(1),e.readBits(1)){let F=C(e),z=C(e),U=C(e),J=C(e),W,$;if((l===0?n:0)===0)W=1,$=2-y;else{let ne=n===3?1:2,Ue=n===1?2:1;W=ne,$=Ue*(2-y)}g-=W*(F+z),w-=$*(U+J)}let A=2,S=2,T=2,v=0,I={num:1,den:1},_=null,k=null;if(e.readBits(1)){if(e.readBits(1)){let Ue=e.readBits(8);if(Ue===255)I={num:e.readBits(16),den:e.readBits(16)};else{let Bt=As[Ue];Bt&&(I=Bt)}}e.readBits(1)&&e.skipBits(1),e.readBits(1)&&(e.skipBits(3),v=e.readBits(1),e.readBits(1)&&(A=e.readBits(8),S=e.readBits(8),T=e.readBits(8))),e.readBits(1)&&(C(e),C(e)),e.readBits(1)&&(e.skipBits(32),e.skipBits(32),e.skipBits(1));let $=e.readBits(1);$&&fs(e);let j=e.readBits(1);j&&fs(e),($||j)&&e.skipBits(1),e.skipBits(1),e.readBits(1)&&(e.skipBits(1),C(e),C(e),C(e),C(e),_=C(e),k=C(e))}if(_===null){p(k===null);let F=s&16;if((i===44||i===86||i===100||i===110||i===122||i===244)&&F)_=0,k=0;else{let z=d+1,U=f+1,J=(2-y)*U,W=lr.find(j=>j.level>=o)??X(lr),$=Math.min(Math.floor(W.maxDpbMbs/(z*J)),16);_=$,k=$}}return p(k!==null),{profileIdc:i,constraintFlags:s,levelIdc:o,frameMbsOnlyFlag:y,chromaFormatIdc:n,bitDepthLumaMinus8:a,bitDepthChromaMinus8:c,codedWidth:h,codedHeight:m,displayWidth:g,displayHeight:w,pixelAspectRatio:I,colourPrimaries:A,matrixCoefficients:T,transferCharacteristics:S,fullRangeFlag:v,numReorderFrames:_,maxDecFrameBuffering:k}}catch(e){return M._error("Error parsing AVC SPS:",e),null}},fs=t=>{let e=C(t);t.skipBits(4),t.skipBits(4);for(let r=0;r<=e;r++)C(t),C(t),t.skipBits(1);t.skipBits(5),t.skipBits(5),t.skipBits(5),t.skipBits(5)},Go=(t,e)=>{if(e.description){let s=(ie(e.description)[21]&3)+1;return Ur(t,s)}else return ps(t)},fr=(t,e)=>{if(e.description){let s=(ie(e.description)[21]&3)+1;return ms(t,s)}else return Dt(t)},Ot=t=>t>>1&63,$o=t=>{try{let e=new H(Vr(t));e.skipBits(16),e.readBits(4);let r=e.readBits(3),i=e.readBits(1),{general_profile_space:s,general_tier_flag:o,general_profile_idc:n,general_profile_compatibility_flags:a,general_constraint_indicator_flags:c,general_level_idc:l}=Xo(e,r);C(e);let u=C(e),d=0;u===3&&(d=e.readBits(1));let f=C(e),h=C(e),m=f,g=h;if(e.readBits(1)){let z=C(e),U=C(e),J=C(e),W=C(e),$=1,j=1,ne=d===0?u:0;ne===1?($=2,j=2):ne===2&&($=2,j=1),m-=(z+U)*$,g-=(J+W)*j}let w=C(e),y=C(e);C(e);let A=e.readBits(1)?0:r,S=0;for(let z=A;z<=r;z++)C(e),S=C(e),C(e);C(e),C(e),C(e),C(e),C(e),C(e),e.readBits(1)&&e.readBits(1)&&Yo(e),e.skipBits(1),e.skipBits(1),e.readBits(1)&&(e.skipBits(4),e.skipBits(4),C(e),C(e),e.skipBits(1));let T=C(e);if(Zo(e,T),e.readBits(1)){let z=C(e);for(let U=0;U<z;U++)C(e),e.skipBits(1)}e.skipBits(1),e.skipBits(1);let v=2,I=2,_=2,k=0,B=0,F={num:1,den:1};if(e.readBits(1)){let z=ea(e,r);F=z.pixelAspectRatio,v=z.colourPrimaries,I=z.transferCharacteristics,_=z.matrixCoefficients,k=z.fullRangeFlag,B=z.minSpatialSegmentationIdc}return{displayWidth:m,displayHeight:g,pixelAspectRatio:F,colourPrimaries:v,transferCharacteristics:I,matrixCoefficients:_,fullRangeFlag:k,maxDecFrameBuffering:S+1,spsMaxSubLayersMinus1:r,spsTemporalIdNestingFlag:i,generalProfileSpace:s,generalTierFlag:o,generalProfileIdc:n,generalProfileCompatibilityFlags:a,generalConstraintIndicatorFlags:c,generalLevelIdc:l,chromaFormatIdc:u,bitDepthLumaMinus8:w,bitDepthChromaMinus8:y,minSpatialSegmentationIdc:B}}catch(e){return M._error("Error parsing HEVC SPS:",e),null}},Ts=t=>{try{let e=[],r=[],i=[],s=[];for(let l of Dt(t)){let u=t.subarray(l.offset,l.offset+l.length),d=Ot(u[0]);d===de.VPS_NUT?e.push(u):d===de.SPS_NUT?r.push(u):d===de.PPS_NUT?i.push(u):(d===de.PREFIX_SEI_NUT||d===de.SUFFIX_SEI_NUT)&&s.push(u)}if(r.length===0||i.length===0)return null;let o=$o(r[0]);if(!o)return null;let n=0;if(i.length>0){let l=i[0],u=new H(Vr(l));u.skipBits(16),C(u),C(u),u.skipBits(1),u.skipBits(1),u.skipBits(3),u.skipBits(1),u.skipBits(1),C(u),C(u),Re(u),u.skipBits(1),u.skipBits(1),u.readBits(1)&&C(u),Re(u),Re(u),u.skipBits(1),u.skipBits(1),u.skipBits(1),u.skipBits(1);let d=u.readBits(1),f=u.readBits(1);!d&&!f?n=0:d&&!f?n=2:!d&&f?n=3:n=0}let a=[...e.length?[{arrayCompleteness:1,nalUnitType:de.VPS_NUT,nalUnits:e}]:[],...r.length?[{arrayCompleteness:1,nalUnitType:de.SPS_NUT,nalUnits:r}]:[],...i.length?[{arrayCompleteness:1,nalUnitType:de.PPS_NUT,nalUnits:i}]:[],...s.length?[{arrayCompleteness:1,nalUnitType:Ot(s[0][0]),nalUnits:s}]:[]];return{configurationVersion:1,generalProfileSpace:o.generalProfileSpace,generalTierFlag:o.generalTierFlag,generalProfileIdc:o.generalProfileIdc,generalProfileCompatibilityFlags:o.generalProfileCompatibilityFlags,generalConstraintIndicatorFlags:o.generalConstraintIndicatorFlags,generalLevelIdc:o.generalLevelIdc,minSpatialSegmentationIdc:o.minSpatialSegmentationIdc,parallelismType:n,chromaFormatIdc:o.chromaFormatIdc,bitDepthLumaMinus8:o.bitDepthLumaMinus8,bitDepthChromaMinus8:o.bitDepthChromaMinus8,avgFrameRate:0,constantFrameRate:0,numTemporalLayers:o.spsMaxSubLayersMinus1+1,temporalIdNested:o.spsTemporalIdNestingFlag,lengthSizeMinusOne:3,arrays:a}}catch(e){return M._error("Error building HEVC Decoder Configuration Record:",e),null}},Xo=(t,e)=>{let r=t.readBits(2),i=t.readBits(1),s=t.readBits(5),o=0;for(let u=0;u<32;u++)o=o<<1|t.readBits(1);let n=new Uint8Array(6);for(let u=0;u<6;u++)n[u]=t.readBits(8);let a=t.readBits(8),c=[],l=[];for(let u=0;u<e;u++)c.push(t.readBits(1)),l.push(t.readBits(1));if(e>0)for(let u=e;u<8;u++)t.skipBits(2);for(let u=0;u<e;u++)c[u]&&t.skipBits(88),l[u]&&t.skipBits(8);return{general_profile_space:r,general_tier_flag:i,general_profile_idc:s,general_profile_compatibility_flags:o,general_constraint_indicator_flags:n,general_level_idc:a}},Yo=t=>{for(let e=0;e<4;e++)for(let r=0;r<(e===3?2:6);r++)if(!t.readBits(1))C(t);else{let s=Math.min(64,1<<4+(e<<1));e>1&&Re(t);for(let o=0;o<s;o++)Re(t)}},Zo=(t,e)=>{let r=[];for(let i=0;i<e;i++)r[i]=Jo(t,i,e,r)},Jo=(t,e,r,i)=>{let s=0,o=0,n=0;if(e!==0&&(o=t.readBits(1)),o){if(e===r){let c=C(t);n=e-(c+1)}else n=e-1;t.readBits(1),C(t);let a=i[n]??0;for(let c=0;c<=a;c++)t.readBits(1)||t.readBits(1);s=i[n]}else{let a=C(t),c=C(t);for(let l=0;l<a;l++)C(t),t.readBits(1);for(let l=0;l<c;l++)C(t),t.readBits(1);s=a+c}return s},ea=(t,e)=>{let r=2,i=2,s=2,o=0,n=0,a={num:1,den:1};if(t.readBits(1)){let c=t.readBits(8);if(c===255)a={num:t.readBits(16),den:t.readBits(16)};else{let l=As[c];l&&(a=l)}}return t.readBits(1)&&t.readBits(1),t.readBits(1)&&(t.readBits(3),o=t.readBits(1),t.readBits(1)&&(r=t.readBits(8),i=t.readBits(8),s=t.readBits(8))),t.readBits(1)&&(C(t),C(t)),t.readBits(1),t.readBits(1),t.readBits(1),t.readBits(1)&&(C(t),C(t),C(t),C(t)),t.readBits(1)&&(t.readBits(32),t.readBits(32),t.readBits(1)&&C(t),t.readBits(1)&&ta(t,!0,e)),t.readBits(1)&&(t.readBits(1),t.readBits(1),t.readBits(1),n=C(t),C(t),C(t),C(t),C(t)),{pixelAspectRatio:a,colourPrimaries:r,transferCharacteristics:i,matrixCoefficients:s,fullRangeFlag:o,minSpatialSegmentationIdc:n}},ta=(t,e,r)=>{let i=!1,s=!1,o=!1;e&&(i=t.readBits(1)===1,s=t.readBits(1)===1,(i||s)&&(o=t.readBits(1)===1,o&&(t.readBits(8),t.readBits(5),t.readBits(1),t.readBits(5)),t.readBits(4),t.readBits(4),o&&t.readBits(4),t.readBits(5),t.readBits(5),t.readBits(5)));for(let n=0;n<=r;n++){let a=t.readBits(1)===1,c=!0;a||(c=t.readBits(1)===1);let l=!1;c?C(t):l=t.readBits(1)===1;let u=1;l||(u=C(t)+1),i&&hs(t,u,o),s&&hs(t,u,o)}},hs=(t,e,r)=>{for(let i=0;i<e;i++)C(t),C(t),r&&(C(t),C(t)),t.readBits(1)},xs=t=>{let e=[];e.push(t.configurationVersion),e.push((t.generalProfileSpace&3)<<6|(t.generalTierFlag&1)<<5|t.generalProfileIdc&31),e.push(t.generalProfileCompatibilityFlags>>>24&255),e.push(t.generalProfileCompatibilityFlags>>>16&255),e.push(t.generalProfileCompatibilityFlags>>>8&255),e.push(t.generalProfileCompatibilityFlags&255),e.push(...t.generalConstraintIndicatorFlags),e.push(t.generalLevelIdc&255),e.push(240|t.minSpatialSegmentationIdc>>8&15),e.push(t.minSpatialSegmentationIdc&255),e.push(252|t.parallelismType&3),e.push(252|t.chromaFormatIdc&3),e.push(248|t.bitDepthLumaMinus8&7),e.push(248|t.bitDepthChromaMinus8&7),e.push(t.avgFrameRate>>8&255),e.push(t.avgFrameRate&255),e.push((t.constantFrameRate&3)<<6|(t.numTemporalLayers&7)<<3|(t.temporalIdNested&1)<<2|t.lengthSizeMinusOne&3),e.push(t.arrays.length&255);for(let r of t.arrays){e.push((r.arrayCompleteness&1)<<7|0|r.nalUnitType&63),e.push(r.nalUnits.length>>8&255),e.push(r.nalUnits.length&255);for(let i of r.nalUnits){e.push(i.length>>8&255),e.push(i.length&255);for(let s=0;s<i.length;s++)e.push(i[s])}}return new Uint8Array(e)};var ue;(function(t){t[t.audAllowed=0]="audAllowed",t[t.beforeFirstVcl=1]="beforeFirstVcl",t[t.afterFirstVcl=2]="afterFirstVcl",t[t.eoBitstreamAllowed=3]="eoBitstreamAllowed",t[t.noMoreDataAllowed=4]="noMoreDataAllowed"})(ue||(ue={}));var _s=(t,e)=>{let r=new Set,i=ue.audAllowed;for(let o of fr(t,e)){if(i===ue.noMoreDataAllowed){r.add(o.offset);continue}let n=Ot(t[o.offset]);if(i===ue.eoBitstreamAllowed&&n!==37){r.add(o.offset);continue}let a=!1;n===35?i>ue.audAllowed?a=!0:i=ue.beforeFirstVcl:n<=31?i>ue.afterFirstVcl?a=!0:i=ue.afterFirstVcl:n===36?i!==ue.afterFirstVcl?a=!0:i=ue.eoBitstreamAllowed:n===37?i<ue.afterFirstVcl?a=!0:i=ue.noMoreDataAllowed:n===32||n===33||n===34||n===39||n>=41&&n<=44||n>=48&&n<=55?i>ue.beforeFirstVcl?a=!0:i=ue.beforeFirstVcl:(n===38||n===40||n>=45&&n<=47||n>=56&&n<=63)&&i<ue.afterFirstVcl&&(a=!0),a&&r.add(o.offset)}if(r.size===0)return null;let s=[];for(let o of fr(t,e))r.has(o.offset)||s.push(t.subarray(o.offset,o.offset+o.length));return Go(s,e)},Ss=t=>{let e=new H(t);if(e.readBits(2)!==2)return null;let i=e.readBits(1),o=(e.readBits(1)<<1)+i;if(o===3&&e.skipBits(1),e.readBits(1)===1||e.readBits(1)!==0||(e.skipBits(2),e.readBits(24)!==4817730))return null;let l=8;o>=2&&(l=e.readBits(1)?12:10);let u=e.readBits(3),d=0,f=0;if(u!==7)if(f=e.readBits(1),o===1||o===3){let I=e.readBits(1),_=e.readBits(1);d=!I&&!_?3:I&&!_?2:1,e.skipBits(1)}else d=1;else d=3,f=1;let h=e.readBits(16),m=e.readBits(16),g=h+1,w=m+1,y=g*w,b=X(qe).level;for(let v of qe)if(y<=v.maxPictureSize){b=v.level;break}return{profile:o,level:b,bitDepth:l,chromaSubsampling:d,videoFullRangeFlag:f,colourPrimaries:u===2?1:u===1?6:2,transferCharacteristics:u===2?1:u===1?6:2,matrixCoefficients:u===7?0:u===2?1:u===1?6:2}},ks=function*(t){let e=new H(t),r=()=>{let i=0;for(let s=0;s<8;s++){let o=e.readAlignedByte();if(i|=(o&127)<<s*7,!(o&128))break;if(s===7&&o&128)return null}return i>=2**32-1?null:i};for(;e.getBitsLeft()>=8;){e.skipBits(1);let i=e.readBits(4),s=e.readBits(1),o=e.readBits(1);e.skipBits(1),s&&e.skipBits(8);let n;if(o){let a=r();if(a===null)return;n=a}else n=Math.floor(e.getBitsLeft()/8);p(e.pos%8===0),yield{type:i,data:t.subarray(e.pos/8,e.pos/8+n)},e.skipBits(n*8)}},Cs=t=>{for(let{type:e,data:r}of ks(t)){if(e!==1)continue;let i=new H(r),s=i.readBits(3),o=i.readBits(1),n=i.readBits(1),a=0,c=0,l=0;if(n)a=i.readBits(5);else{if(i.readBits(1)&&(i.skipBits(32),i.skipBits(32),i.readBits(1)))return null;let v=i.readBits(1);v&&(l=i.readBits(5),i.skipBits(32),i.skipBits(5),i.skipBits(5));let I=i.readBits(5);for(let _=0;_<=I;_++){i.skipBits(12);let k=i.readBits(5);if(_===0&&(a=k),k>7){let F=i.readBits(1);_===0&&(c=F)}if(v&&i.readBits(1)){let z=l+1;i.skipBits(z),i.skipBits(z),i.skipBits(1)}i.readBits(1)&&i.skipBits(4)}}let u=i.readBits(4),d=i.readBits(4),f=u+1;i.skipBits(f);let h=d+1;i.skipBits(h);let m=0;if(n?m=0:m=i.readBits(1),m&&(i.skipBits(4),i.skipBits(3)),i.skipBits(1),i.skipBits(1),i.skipBits(1),!n){i.skipBits(1),i.skipBits(1),i.skipBits(1),i.skipBits(1);let T=i.readBits(1);T&&(i.skipBits(1),i.skipBits(1));let v=i.readBits(1),I=0;v?I=2:I=i.readBits(1),I>0&&(i.readBits(1)||i.skipBits(1)),T&&i.skipBits(3)}i.skipBits(1),i.skipBits(1),i.skipBits(1);let g=i.readBits(1),w=8;s===2&&g?w=i.readBits(1)?12:10:s<=2&&(w=g?10:8);let y=0;s!==1&&(y=i.readBits(1));let b=1,A=1,S=0;return y||(s===0?(b=1,A=1):s===1?(b=0,A=0):w===12&&(b=i.readBits(1),b&&(A=i.readBits(1))),b&&A&&(S=i.readBits(2))),{profile:s,level:a,tier:c,bitDepth:w,monochrome:y,chromaSubsamplingX:b,chromaSubsamplingY:A,chromaSamplePosition:S}}return null},Es=t=>{let e=L(t),r=e.getUint8(9),i=e.getUint16(10,!0),s=e.getUint32(12,!0),o=e.getInt16(16,!0),n=e.getUint8(18),a=null;return n&&(a=t.subarray(19,21+r)),{outputChannelCount:r,preSkip:i,inputSampleRate:s,outputGain:o,channelMappingFamily:n,channelMappingTable:a}};var Vt=(t,e,r)=>{switch(t){case"avc":{for(let i of Ui(r,e)){let s=r[i.offset],o=Dr(s);if(o>=Ce.NON_IDR_SLICE&&o<=Ce.SLICE_DPC)return"delta";if(o===Ce.IDR)return"key";if(o===Ce.SEI&&(!ar()||qn()>=144)){let n=r.subarray(i.offset,i.offset+i.length),a=Vr(n),c=1;do{let l=0;for(;;){let f=a[c++];if(f===void 0||(l+=f,f<255))break}let u=0;for(;;){let f=a[c++];if(f===void 0||(u+=f,f<255))break}if(l===6){let f=new H(a);f.pos=8*c;let h=C(f),m=f.readBits(1);if(h===0&&m===1)return"key"}c+=u}while(c<a.length-1)}}return"delta"}case"hevc":{for(let i of fr(r,e)){let s=Ot(r[i.offset]);if(s<de.BLA_W_LP)return"delta";if(s<=de.RSV_IRAP_VCL23)return"key"}return"delta"}case"vp8":return(r[0]&1)===0?"key":"delta";case"vp9":{let i=new H(r);if(i.readBits(2)!==2)return null;let s=i.readBits(1);return(i.readBits(1)<<1)+s===3&&i.skipBits(1),i.readBits(1)?null:i.readBits(1)===0?"key":"delta"}case"av1":{let i=!1;for(let{type:s,data:o}of ks(r))if(s===1){let n=new H(o);n.skipBits(4),i=!!n.readBits(1)}else if(s===3||s===6||s===7){if(i)return"key";let n=new H(o);return n.readBits(1)?null:n.readBits(2)===0?"key":"delta"}return null}case"prores":return"key";default:ae(t),p(!1)}},Or;(function(t){t[t.STREAMINFO=0]="STREAMINFO",t[t.VORBIS_COMMENT=4]="VORBIS_COMMENT",t[t.PICTURE=6]="PICTURE"})(Or||(Or={}));var Wi=[2,1,2,3,3,4,4,5],vs=t=>{if(t.length<7||t[0]!==11||t[1]!==119)return null;let e=new H(t);e.skipBits(16),e.skipBits(16);let r=e.readBits(2);if(r===3)return null;let i=e.readBits(6),s=e.readBits(5);if(s>8)return null;let o=e.readBits(3),n=e.readBits(3);(n&1)!==0&&n!==1&&e.skipBits(2),(n&4)!==0&&e.skipBits(2),n===2&&e.skipBits(2);let a=e.readBits(1),c=Math.floor(i/2);return{fscod:r,bsid:s,bsmod:o,acmod:n,lfeon:a,bitRateCode:c}},tu=[128,138,192,128,140,192,160,174,240,160,176,240,192,208,288,192,210,288,224,242,336,224,244,336,256,278,384,256,280,384,320,348,480,320,350,480,384,416,288*2,384,418,288*2,448,486,336*2,448,488,336*2,256*2,278*2,384*2,256*2,279*2,384*2,320*2,348*2,480*2,320*2,349*2,480*2,384*2,417*2,576*2,384*2,418*2,576*2,448*2,487*2,672*2,448*2,488*2,672*2,512*2,557*2,768*2,512*2,558*2,768*2,640*2,696*2,960*2,640*2,697*2,960*2,768*2,835*2,1152*2,768*2,836*2,1152*2,896*2,975*2,1344*2,896*2,976*2,1344*2,1024*2,1114*2,1536*2,1024*2,1115*2,1536*2,1152*2,1253*2,1728*2,1152*2,1254*2,1728*2,1280*2,1393*2,1920*2,1280*2,1394*2,1920*2];var ru=new Uint8Array([5,4,65,67,45,51]),iu=new Uint8Array([5,4,69,65,67,51]),ra=[1,2,3,6],Is=t=>{if(t.length<6||t[0]!==11||t[1]!==119)return null;let e=new H(t);e.skipBits(16);let r=e.readBits(2);if(e.skipBits(3),r!==0&&r!==2)return null;let i=e.readBits(11),s=e.readBits(2),o=0,n;s===3?(o=e.readBits(2),n=3):n=e.readBits(2);let a=e.readBits(3),c=e.readBits(1),l=e.readBits(5);if(l<11||l>16)return null;let u=ra[n],d;return s<3?d=dr[s]/1e3:d=Di[o]/1e3,{dataRate:Math.round((i+1)*d/(u*16)),substreams:[{fscod:s,fscod2:o,bsid:l,bsmod:0,acmod:a,lfeon:c,numDepSub:0,chanLoc:0}]}},Ps=t=>{if(t.length<2)return null;let e=new H(t),r=e.readBits(13),i=e.readBits(3),s=[];for(let o=0;o<=i&&!(Math.ceil(e.pos/8)+3>t.length);o++){let n=e.readBits(2),a=e.readBits(5);e.skipBits(1),e.skipBits(1);let c=e.readBits(3),l=e.readBits(3),u=e.readBits(1);e.skipBits(3);let d=e.readBits(4),f=0;d>0?f=e.readBits(9):e.skipBits(1),s.push({fscod:n,fscod2:null,bsid:a,bsmod:c,acmod:l,lfeon:u,numDepSub:d,chanLoc:f})}return s.length===0?null:{dataRate:r,substreams:s}},Bs=t=>{let e=t.substreams[0];return p(e),e.fscod<3?dr[e.fscod]:e.fscod2!==null&&e.fscod2<3?Di[e.fscod2]:null},Rs=t=>{let e=t.substreams[0];p(e);let r=Wi[e.acmod]+e.lfeon;if(e.numDepSub>0){let i=[2,2,1,1,2,2,2,1,1];for(let s=0;s<9;s++)e.chanLoc&1<<8-s&&(r+=i[s])}return r};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var Lr=class{constructor(e){this.input=e}dispose(){}};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var hr=new Uint8Array(0),ee=class t{constructor(e,r,i,s,o=-1,n,a){if(this.data=e,this.type=r,this.timestamp=i,this.duration=s,this.sequenceNumber=o,e===hr&&n===void 0)throw new Error("Internal error: byteLength must be explicitly provided when constructing metadata-only packets.");if(n===void 0&&(n=e.byteLength),!(e instanceof Uint8Array))throw new TypeError("data must be a Uint8Array.");if(r!=="key"&&r!=="delta")throw new TypeError('type must be either "key" or "delta".');if(!Number.isFinite(i))throw new TypeError("timestamp must be a number.");if(!Number.isFinite(s)||s<0)throw new TypeError("duration must be a non-negative number.");if(!Number.isFinite(o))throw new TypeError("sequenceNumber must be a number.");if(!Number.isInteger(n)||n<0)throw new TypeError("byteLength must be a non-negative integer.");if(a!==void 0&&(typeof a!="object"||!a))throw new TypeError("sideData, when provided, must be an object.");if(a?.alpha!==void 0&&!(a.alpha instanceof Uint8Array))throw new TypeError("sideData.alpha, when provided, must be a Uint8Array.");if(a?.alphaByteLength!==void 0&&(!Number.isInteger(a.alphaByteLength)||a.alphaByteLength<0))throw new TypeError("sideData.alphaByteLength, when provided, must be a non-negative integer.");this.byteLength=n,this.sideData=a??{},this.sideData.alpha&&this.sideData.alphaByteLength===void 0&&(this.sideData.alphaByteLength=this.sideData.alpha.byteLength)}get isMetadataOnly(){return this.data===hr}get microsecondTimestamp(){return Math.trunc(Fe*this.timestamp)}get microsecondDuration(){return Math.trunc(Fe*this.duration)}toEncodedVideoChunk(){if(this.isMetadataOnly)throw new TypeError("Metadata-only packets cannot be converted to a video chunk.");if(typeof EncodedVideoChunk>"u")throw new Error("Your browser does not support EncodedVideoChunk.");return new EncodedVideoChunk({data:this.data,type:this.type,timestamp:this.microsecondTimestamp,duration:this.microsecondDuration})}alphaToEncodedVideoChunk(e=this.type){if(!this.sideData.alpha)throw new TypeError("This packet does not contain alpha side data.");if(this.isMetadataOnly)throw new TypeError("Metadata-only packets cannot be converted to a video chunk.");if(typeof EncodedVideoChunk>"u")throw new Error("Your browser does not support EncodedVideoChunk.");return new EncodedVideoChunk({data:this.sideData.alpha,type:e,timestamp:this.microsecondTimestamp,duration:this.microsecondDuration})}toEncodedAudioChunk(){if(this.isMetadataOnly)throw new TypeError("Metadata-only packets cannot be converted to an audio chunk.");if(typeof EncodedAudioChunk>"u")throw new Error("Your browser does not support EncodedAudioChunk.");return new EncodedAudioChunk({data:this.data,type:this.type,timestamp:this.microsecondTimestamp,duration:this.microsecondDuration})}static fromEncodedChunk(e,r){if(!(e instanceof EncodedVideoChunk||e instanceof EncodedAudioChunk))throw new TypeError("chunk must be an EncodedVideoChunk or EncodedAudioChunk.");let i=new Uint8Array(e.byteLength);return e.copyTo(i),new t(i,e.type,e.timestamp/1e6,(e.duration??0)/1e6,void 0,void 0,r)}clone(e){if(e!==void 0&&(typeof e!="object"||e===null))throw new TypeError("options, when provided, must be an object.");if(e?.data!==void 0&&!(e.data instanceof Uint8Array))throw new TypeError("options.data, when provided, must be a Uint8Array.");if(e?.type!==void 0&&e.type!=="key"&&e.type!=="delta")throw new TypeError('options.type, when provided, must be either "key" or "delta".');if(e?.timestamp!==void 0&&!Number.isFinite(e.timestamp))throw new TypeError("options.timestamp, when provided, must be a number.");if(e?.duration!==void 0&&!Number.isFinite(e.duration))throw new TypeError("options.duration, when provided, must be a number.");if(e?.sequenceNumber!==void 0&&!Number.isFinite(e.sequenceNumber))throw new TypeError("options.sequenceNumber, when provided, must be a number.");if(e?.sideData!==void 0&&(typeof e.sideData!="object"||e.sideData===null))throw new TypeError("options.sideData, when provided, must be an object.");return new t(e?.data??this.data,e?.type??this.type,e?.timestamp??this.timestamp,e?.duration??this.duration,e?.sequenceNumber??this.sequenceNumber,this.byteLength,e?.sideData??this.sideData)}};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var Wr=t=>{let r=(t.hasVideo?"video/":t.hasAudio?"audio/":"application/")+(t.isQuickTime?"quicktime":"mp4");if(t.codecStrings.length>0){let i=[...new Set(t.codecStrings)];r+=`; codecs="${i.join(", ")}"`}return r},Fs=t=>{let e=L(t),r=0,i=e.getUint8(r);r+=1,r+=3;let s=nt(t.subarray(r,r+16));r+=16;let o=null;if(i>0){let a=e.getUint32(r);if(r+=4,a>0){o=[];for(let c=0;c<a;c++)o.push(nt(t.subarray(r,r+16))),r+=16}}let n=e.getUint32(r);return r+=4,{systemId:s,keyIds:o,data:t.slice(r,r+n)}},Ms=(t,e)=>t.systemId===e.systemId&&jn(t.data,e.data);/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var Ee=8,je=16,Qe=t=>{let e=E(t),r=ge(t,4),i=8;e===1&&(e=pe(t),i=16);let o=e-i;return o<0?null:{name:r,totalSize:e,headerSize:i,contentSize:o}},ct=t=>Ke(t)/65536,Nr=t=>Ke(t)/1073741824,Hr=t=>{let e=0;for(let r=0;r<4;r++){e<<=7;let i=D(t);if(e|=i&127,(i&128)===0)break}return e},ve=t=>{let e=se(t);return t.skip(2),e=Math.min(e,t.remainingLength),it.decode(q(t,e))},zs=t=>{let e=Qe(t);if(!e||e.name!=="data"||t.remainingLength<8)return null;let r=E(t);t.skip(4);let i=q(t,e.contentSize-8);switch(r){case 1:return it.decode(i);case 2:return new TextDecoder("utf-16be").decode(i);case 13:return new ke(i,"image/jpeg");case 14:return new ke(i,"image/png");case 27:return new ke(i,"image/bmp");default:return i}};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var Ni=16,Ge=new Uint32Array(256),Ut=new Uint32Array(256),Lt=new Uint32Array(256),Wt=new Uint32Array(256),Nt=new Uint32Array(256),ce=new Uint32Array(256),Os=new Uint32Array(10),Ds=!1,ia=()=>{let t=new Uint8Array(256),e=new Uint8Array(256),r=new Uint8Array(256);for(let o=0,n=1;o<256;o++)r[o]=n,e[n]=o,n=n^n<<1^(n&128?283:0);let i=(o,n)=>o&&n?r[(e[o]+e[n])%255]:0;t[0]=99;for(let o=1;o<256;o++){let n=r[255-e[o]],a=n^n<<1^n<<2^n<<3^n<<4;a=a>>>8^a&255^99,t[o]=a}for(let o=0;o<256;o++){let n=t[o],a=t.indexOf(o);Ge[o]=n<<24|n<<16|n<<8|n,ce[o]=a<<24|a<<16|a<<8|a;let c=i(a,14),l=i(a,9),u=i(a,13),d=i(a,11),f=c<<24|l<<16|u<<8|d;Ut[o]=f,Lt[o]=f>>>8|f<<24,Wt[o]=f>>>16|f<<16,Nt[o]=f>>>24|f<<8}let s=1;for(let o=0;o<10;o++)Os[o]=s<<24,s=s<<1^(s&128?283:0);Ds=!0},qr=class{constructor(){this.roundkey=new Uint32Array(44),this.iv=new Uint32Array(Ni/Uint32Array.BYTES_PER_ELEMENT),this.in=new Uint8Array(Ni),this.out=new Uint8Array(Ni),this.inView=new DataView(this.in.buffer),this.outView=new DataView(this.out.buffer)}init({key:e,iv:r}){p(e.byteLength===16),p(r.byteLength===16),Ds||ia();let i=new DataView(e.buffer,e.byteOffset,e.byteLength),s=new DataView(r.buffer,r.byteOffset,r.byteLength);this.roundkey[0]=i.getUint32(0,!1),this.roundkey[1]=i.getUint32(4,!1),this.roundkey[2]=i.getUint32(8,!1),this.roundkey[3]=i.getUint32(12,!1),this.iv[0]=s.getUint32(0,!1),this.iv[1]=s.getUint32(4,!1),this.iv[2]=s.getUint32(8,!1),this.iv[3]=s.getUint32(12,!1);for(let o=4;o<44;o+=4){let n=this.roundkey[o-1];this.roundkey[o]=this.roundkey[o-4]^Ge[n>>>16&255]&4278190080^Ge[n>>>8&255]&16711680^Ge[n>>>0&255]&65280^Ge[n>>>24&255]&255^Os[o/4-1],this.roundkey[o+1]=this.roundkey[o-3]^this.roundkey[o],this.roundkey[o+2]=this.roundkey[o-2]^this.roundkey[o+1],this.roundkey[o+3]=this.roundkey[o-1]^this.roundkey[o+2]}for(let o=0,n=40;o<n;o+=4,n-=4)for(let a=0;a<4;a++){let c=this.roundkey[o+a];this.roundkey[o+a]=this.roundkey[n+a],this.roundkey[n+a]=c}for(let o=4;o<40;o+=4)for(let n=0;n<4;n++){let a=this.roundkey[o+n];this.roundkey[o+n]=Ut[Ge[a>>>24&255]&255]^Lt[Ge[a>>>16&255]&255]^Wt[Ge[a>>>8&255]&255]^Nt[Ge[a>>>0&255]&255]}}decrypt(){let e=this.inView.getUint32(0,!1)^this.roundkey[0],r=this.inView.getUint32(4,!1)^this.roundkey[1],i=this.inView.getUint32(8,!1)^this.roundkey[2],s=this.inView.getUint32(12,!1)^this.roundkey[3],o=this.inView.getUint32(0,!1),n=this.inView.getUint32(4,!1),a=this.inView.getUint32(8,!1),c=this.inView.getUint32(12,!1),l,u,d,f;for(let y=1;y<10;y++){let b=y*4;l=Ut[e>>>24]^Lt[s>>>16&255]^Wt[i>>>8&255]^Nt[r&255]^this.roundkey[b],u=Ut[r>>>24]^Lt[e>>>16&255]^Wt[s>>>8&255]^Nt[i&255]^this.roundkey[b+1],d=Ut[i>>>24]^Lt[r>>>16&255]^Wt[e>>>8&255]^Nt[s&255]^this.roundkey[b+2],f=Ut[s>>>24]^Lt[i>>>16&255]^Wt[r>>>8&255]^Nt[e&255]^this.roundkey[b+3],e=l,r=u,i=d,s=f}let h=ce[e>>>24&255]&4278190080^ce[s>>>16&255]&16711680^ce[i>>>8&255]&65280^ce[r>>>0&255]&255^this.roundkey[40],m=ce[r>>>24&255]&4278190080^ce[e>>>16&255]&16711680^ce[s>>>8&255]&65280^ce[i>>>0&255]&255^this.roundkey[41],g=ce[i>>>24&255]&4278190080^ce[r>>>16&255]&16711680^ce[e>>>8&255]&65280^ce[s>>>0&255]&255^this.roundkey[42],w=ce[s>>>24&255]&4278190080^ce[i>>>16&255]&16711680^ce[r>>>8&255]&65280^ce[e>>>0&255]&255^this.roundkey[43];this.outView.setUint32(0,h^this.iv[0],!1),this.outView.setUint32(4,m^this.iv[1],!1),this.outView.setUint32(8,g^this.iv[2],!1),this.outView.setUint32(12,w^this.iv[3],!1),this.iv[0]=o,this.iv[1]=n,this.iv[2]=a,this.iv[3]=c}};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var jr=class t extends Lr{constructor(e){super(e),this.moovSlice=null,this.currentTrack=null,this.tracks=[],this.metadataPromise=null,this.movieTimescale=-1,this.movieDurationInTimescale=-1,this.isQuickTime=!1,this.metadataTags={},this.currentMetadataKeys=null,this.isFragmented=!1,this.fragmentTrackDefaults=[],this.psshBoxes=[],this.currentFragment=null,this.lastReadFragment=null,this.decryptionKeyCache=new Map,this.reader=e._reader}async getTrackBackings(){return await this.readMetadata(),this.tracks.map(e=>e.trackBacking)}async getMimeType(){await this.readMetadata();let e=await this.getTrackBackings(),r=await Promise.all(e.map(i=>i.getDecoderConfig().then(s=>s?.codec??null)));return Wr({isQuickTime:this.isQuickTime,hasVideo:this.tracks.some(i=>i.info?.type==="video"),hasAudio:this.tracks.some(i=>i.info?.type==="audio"),codecStrings:r.filter(Boolean)})}async getMetadataTags(){return await this.readMetadata(),this.metadataTags}readMetadata(){return this.metadataPromise??=(async()=>{let e=0,r=!1;for(;;){let i=this.reader.requestSliceRange(e,Ee,je);if(i instanceof Promise&&(i=await i),!i)break;let s=e,o=Qe(i);if(!o)break;if(o.name==="ftyp"||o.name==="styp"){let n=ge(i,4);this.isQuickTime=n==="qt  "}else if(o.name==="moov"){let n=this.reader.requestSlice(i.filePos,o.contentSize);if(n instanceof Promise&&(n=await n),!n)break;this.moovSlice=n,this.readContiguousBoxes(this.moovSlice);for(let a of this.tracks){let c=a.editListPreviousSegmentDurations/this.movieTimescale;a.editListOffset-=Math.round(c*a.timescale)}r=this.isFragmented&&this.reader.fileSize!==null&&this.reader.fileSize>s+o.totalSize;break}else if(o.name==="moof"){if(!this.input._initInput)throw new Error('"moof" box encountered with no "moov" box present; this file is likely a Segment as described in ISO/IEC 14496-12 Section 8.16. A separate init file that contains a "moov" box is required to read this file, please provide it using InputOptions.initInput.');let n=await this.input._initInput._getDemuxer();if(n.constructor!==t)throw new Error("Init input must match the input's format.");await n.readMetadata(),this.movieTimescale=n.movieTimescale,this.movieDurationInTimescale=n.movieDurationInTimescale,this.metadataTags=n.metadataTags,this.isFragmented=!0,this.fragmentTrackDefaults=n.fragmentTrackDefaults,this.psshBoxes=n.psshBoxes;for(let a of n.tracks){let c={id:a.id,demuxer:this,trackBacking:null,disposition:a.disposition,timescale:a.timescale,durationInMediaTimescale:a.durationInMediaTimescale,durationInMovieTimescale:a.durationInMovieTimescale,rotation:a.rotation,internalCodecId:a.internalCodecId,name:a.name,languageCode:a.languageCode,sampleTableByteOffset:null,sampleTable:null,fragmentLookupTable:[],currentFragmentState:null,fragmentPositionCache:[],editListPreviousSegmentDurations:a.editListPreviousSegmentDurations,editListOffset:a.editListOffset,encryptionInfo:a.encryptionInfo,encryptionAuxInfo:null,frmaCodecString:null,info:a.info};if(a.trackBacking){if(p(c.info),c.info.type==="video"&&c.info.width!==-1){let l=c;c.trackBacking=new Kr(l),this.tracks.push(c)}else if(c.info.type==="audio"&&c.info.numberOfChannels!==-1){let l=c;c.trackBacking=new Gr(l),this.tracks.push(c)}}}r=!1;break}e=s+o.totalSize}if(r){p(this.reader.fileSize!==null);let i=this.reader.requestSlice(this.reader.fileSize-4,4);i instanceof Promise&&(i=await i),p(i);let s=E(i),o=this.reader.fileSize-s;if(o>=0&&o<=this.reader.fileSize-je){let n=this.reader.requestSliceRange(o,Ee,je);if(n instanceof Promise&&(n=await n),n){let a=Qe(n);if(a&&a.name==="mfra"){let c=this.reader.requestSlice(n.filePos,a.contentSize);c instanceof Promise&&(c=await c),c&&this.readContiguousBoxes(c)}}}}})()}getSampleTableForTrack(e){if(e.sampleTable)return e.sampleTable;let r={sampleTimingEntries:[],sampleCompositionTimeOffsets:[],sampleSizes:[],keySampleIndices:null,chunkOffsets:[],sampleToChunk:[],presentationTimestamps:null,presentationTimestampIndexMap:null};if(e.sampleTable=r,e.sampleTableByteOffset===null)return r;p(this.moovSlice);let i=this.moovSlice.slice(e.sampleTableByteOffset);if(this.currentTrack=e,this.traverseBox(i),this.currentTrack=null,e.info?.type==="audio"&&e.info.codec&&te.includes(e.info.codec)&&r.sampleCompositionTimeOffsets.length===0){p(e.info?.type==="audio");let o=me(e.info.codec),n=[],a=[];for(let c=0;c<r.sampleToChunk.length;c++){let l=r.sampleToChunk[c],u=r.sampleToChunk[c+1],d=(u?u.startChunkIndex:r.chunkOffsets.length)-l.startChunkIndex;for(let f=0;f<d;f++){let h=l.startSampleIndex+f*l.samplesPerChunk,m=h+l.samplesPerChunk,g=Q(r.sampleTimingEntries,h,_=>_.startIndex),w=r.sampleTimingEntries[g],y=Q(r.sampleTimingEntries,m,_=>_.startIndex),b=r.sampleTimingEntries[y],A=w.startDecodeTimestamp+(h-w.startIndex)*w.delta,T=b.startDecodeTimestamp+(m-b.startIndex)*b.delta-A,v=X(n);v&&v.delta===T?v.count++:n.push({startIndex:l.startChunkIndex+f,startDecodeTimestamp:A,count:1,delta:T});let I=l.samplesPerChunk*o.sampleSize*e.info.numberOfChannels;a.push(I)}l.startSampleIndex=l.startChunkIndex,l.samplesPerChunk=1}r.sampleTimingEntries=n,r.sampleSizes=a}if(r.sampleCompositionTimeOffsets.length>0){r.presentationTimestamps=[];for(let o of r.sampleTimingEntries)for(let n=0;n<o.count;n++)r.presentationTimestamps.push({presentationTimestamp:o.startDecodeTimestamp+n*o.delta,sampleIndex:o.startIndex+n});for(let o of r.sampleCompositionTimeOffsets)for(let n=0;n<o.count;n++){let a=o.startIndex+n,c=r.presentationTimestamps[a];c&&(c.presentationTimestamp+=o.offset)}r.presentationTimestamps.sort((o,n)=>o.presentationTimestamp-n.presentationTimestamp),r.presentationTimestampIndexMap=Array(r.presentationTimestamps.length).fill(-1);for(let o=0;o<r.presentationTimestamps.length;o++)r.presentationTimestampIndexMap[r.presentationTimestamps[o].sampleIndex]=o}return r}async readFragment(e){if(this.lastReadFragment?.moofOffset===e)return this.lastReadFragment;let r=this.reader.requestSliceRange(e,Ee,je);r instanceof Promise&&(r=await r),p(r);let i=Qe(r);p(i?.name==="moof");let s=this.reader.requestSlice(e,i.totalSize);s instanceof Promise&&(s=await s),p(s),this.traverseBox(s);let o=this.lastReadFragment;p(o&&o.moofOffset===e);for(let[,n]of o.trackData){let a=n.track,{fragmentPositionCache:c}=a;if(!n.startTimestampIsFinal){let u=a.fragmentLookupTable.find(d=>d.moofOffset===o.moofOffset);if(u)Hi(n,u.timestamp);else{let d=Q(c,o.moofOffset-1,f=>f.moofOffset);if(d!==-1){let f=c[d];Hi(n,f.endTimestamp)}}n.startTimestampIsFinal=!0}let l=Q(c,n.startTimestamp,u=>u.startTimestamp);if((l===-1||c[l].moofOffset!==o.moofOffset)&&c.splice(l+1,0,{moofOffset:o.moofOffset,startTimestamp:n.startTimestamp,endTimestamp:n.endTimestamp}),n.encryptionAuxInfo&&a.encryptionInfo){let u=await Ws(this.reader,a.encryptionInfo,n.encryptionAuxInfo);for(let d=0;d<Math.min(n.samples.length,u.length);d++){let f=u[d];n.samples[d].encryption=f}}}return o}readContiguousBoxes(e){let r=e.filePos;for(;e.filePos-r<=e.length-Ee&&this.traverseBox(e););}*iterateContiguousBoxes(e){let r=e.filePos;for(;e.filePos-r<=e.length-Ee;){let i=e.filePos,s=Qe(e);if(!s)break;yield{boxInfo:s,slice:e},e.filePos=i+s.totalSize}}traverseBox(e){let r=e.filePos,i=Qe(e);if(!i)return!1;let s=e.filePos,o=r+i.totalSize;switch(i.name){case"mdia":case"minf":case"dinf":case"mfra":case"edts":case"sinf":case"schi":this.readContiguousBoxes(e.slice(s,i.contentSize));break;case"mvhd":{let n=D(e);e.skip(3),n===1?(e.skip(16),this.movieTimescale=E(e),this.movieDurationInTimescale=pe(e)):(e.skip(8),this.movieTimescale=E(e),this.movieDurationInTimescale=E(e))}break;case"trak":{let n={id:-1,demuxer:this,trackBacking:null,disposition:{...Gn,primary:!1},info:null,timescale:-1,durationInMovieTimescale:-1,durationInMediaTimescale:-1,rotation:0,internalCodecId:null,name:null,languageCode:ir,sampleTableByteOffset:-1,sampleTable:null,fragmentLookupTable:[],currentFragmentState:null,fragmentPositionCache:[],editListPreviousSegmentDurations:0,editListOffset:0,encryptionInfo:null,encryptionAuxInfo:null,frmaCodecString:null};if(this.currentTrack=n,this.readContiguousBoxes(e.slice(s,i.contentSize)),n.id!==-1&&n.timescale!==-1&&n.info!==null){if(n.info.type==="video"&&n.info.width!==-1){let a=n;n.trackBacking=new Kr(a),this.tracks.push(n)}else if(n.info.type==="audio"&&n.info.numberOfChannels!==-1){let a=n;n.trackBacking=new Gr(a),this.tracks.push(n)}}this.currentTrack=null}break;case"tkhd":{let n=this.currentTrack;if(!n)break;let a=D(e),l=!!($e(e)&1);if(n.disposition.default=l,a===0)e.skip(8),n.id=E(e),e.skip(4),n.durationInMovieTimescale=E(e);else if(a===1)e.skip(16),n.id=E(e),e.skip(4),n.durationInMovieTimescale=pe(e);else throw new Error(`Incorrect track header version ${a}.`);e.skip(16);let u=[ct(e),ct(e),Nr(e),ct(e),ct(e),Nr(e),ct(e),ct(e),Nr(e)],d=ht(nr(aa(u),90));p(d===0||d===90||d===180||d===270),n.rotation=d}break;case"elst":{let n=this.currentTrack;if(!n)break;let a=D(e);e.skip(3);let c=!1,l=0,u=E(e);for(let d=0;d<u;d++){let f=a===1?pe(e):E(e),h=a===1?qs(e):Ke(e),m=ct(e);if(f!==0){if(c){M._warn("Unsupported edit list: multiple edits are not currently supported. Only using first edit.");break}if(h===-1){l+=f;continue}if(m!==1){M._warn("Unsupported edit list entry: media rate must be 1.");break}n.editListPreviousSegmentDurations=l,n.editListOffset=h,c=!0}}}break;case"mdhd":{let n=this.currentTrack;if(!n)break;let a=D(e);e.skip(3),a===0?(e.skip(8),n.timescale=E(e),n.durationInMediaTimescale=E(e)):a===1&&(e.skip(16),n.timescale=E(e),n.durationInMediaTimescale=pe(e));let c=se(e);if(c>0){n.languageCode="";for(let l=0;l<3;l++)n.languageCode=String.fromCharCode(96+(c&31))+n.languageCode,c>>=5;pt(n.languageCode)||(n.languageCode=ir)}}break;case"hdlr":{let n=this.currentTrack;if(!n)break;e.skip(8);let a=ge(e,4);a==="vide"?n.info={type:"video",width:-1,height:-1,squarePixelWidth:-1,squarePixelHeight:-1,codec:null,codecDescription:null,colorSpace:null,avcType:null,avcCodecInfo:null,hevcCodecInfo:null,vp9CodecInfo:null,av1CodecInfo:null,proresFormat:null}:a==="soun"&&(n.info={type:"audio",numberOfChannels:-1,sampleRate:-1,codec:null,codecDescription:null,aacCodecInfo:null,pcmLittleEndian:!1,pcmSampleSize:null})}break;case"stbl":{let n=this.currentTrack;if(!n)break;n.sampleTableByteOffset=r,this.readContiguousBoxes(e.slice(s,i.contentSize))}break;case"stsd":{let n=this.currentTrack;if(!n||n.info===null||n.sampleTable)break;let a=D(e);e.skip(3);let c=E(e);for(let l=0;l<c;l++){let u=e.filePos,d=Qe(e);if(!d)break;n.internalCodecId=d.name;let f=d.name.toLowerCase();if(n.info.type==="video"){e.skip(24),n.info.width=se(e),n.info.height=se(e),n.info.squarePixelWidth=n.info.width,n.info.squarePixelHeight=n.info.height,e.skip(50),n.frmaCodecString=null,this.readContiguousBoxes(e.slice(e.filePos,u+d.totalSize-e.filePos));let h=f==="encv"?n.frmaCodecString:f;n.frmaCodecString=null,h==="avc1"||h==="avc3"?(n.info.codec="avc",n.info.avcType=h==="avc1"?1:3):h==="hvc1"||h==="hev1"?n.info.codec="hevc":h==="vp08"?n.info.codec="vp8":h==="vp09"?n.info.codec="vp9":h==="av01"?n.info.codec="av1":yt.includes(f)?(n.info.codec="prores",n.info.proresFormat=f):h===null?M._warn("Unknown encrypted video codec due to missing frma box."):M._warn(`Unsupported video codec (sample entry type '${d.name}').`)}else{e.skip(8);let h=se(e);e.skip(6);let m=se(e),g=se(e);e.skip(4);let w=E(e)/65536,y=null;a===0&&h>0&&(h===1?(e.skip(4),g=8*E(e),e.skip(8)):h===2&&(e.skip(4),w=js(e),m=E(e),e.skip(4),g=E(e),y=E(e),e.skip(8))),n.info.numberOfChannels=m,n.info.sampleRate=w,n.frmaCodecString=null,this.readContiguousBoxes(e.slice(e.filePos,u+d.totalSize-e.filePos));let b=f==="enca"?n.frmaCodecString:f;if(n.frmaCodecString=null,b!=="mp4a")if(b==="opus")n.info.codec="opus",n.info.sampleRate=ss;else if(b==="flac")n.info.codec="flac";else if(b==="ulaw")n.info.codec="ulaw";else if(b==="alaw")n.info.codec="alaw";else if(b==="ac-3")n.info.codec="ac3";else if(b==="ec-3")n.info.codec="eac3";else if(b==="twos")g===8?n.info.codec="pcm-s8":g===16?n.info.codec=n.info.pcmLittleEndian?"pcm-s16":"pcm-s16be":(M._warn(`Unsupported sample size ${g} for codec 'twos'.`),n.info.codec=null);else if(b==="sowt")g===8?n.info.codec="pcm-s8":g===16?n.info.codec="pcm-s16":(M._warn(`Unsupported sample size ${g} for codec 'sowt'.`),n.info.codec=null);else if(b==="raw ")n.info.codec="pcm-u8";else if(b==="in24")n.info.codec=n.info.pcmLittleEndian?"pcm-s24":"pcm-s24be";else if(b==="in32")n.info.codec=n.info.pcmLittleEndian?"pcm-s32":"pcm-s32be";else if(b==="fl32")n.info.codec=n.info.pcmLittleEndian?"pcm-f32":"pcm-f32be";else if(b==="fl64")n.info.codec=n.info.pcmLittleEndian?"pcm-f64":"pcm-f64be";else if(b==="ipcm"){let A=n.info.pcmSampleSize;n.info.pcmLittleEndian?A===16?n.info.codec="pcm-s16":A===24?n.info.codec="pcm-s24":A===32?n.info.codec="pcm-s32":(M._warn(`Invalid ipcm sample size ${A}.`),n.info.codec=null):A===16?n.info.codec="pcm-s16be":A===24?n.info.codec="pcm-s24be":A===32?n.info.codec="pcm-s32be":(M._warn(`Invalid ipcm sample size ${A}.`),n.info.codec=null)}else if(b==="fpcm"){let A=n.info.pcmSampleSize;n.info.pcmLittleEndian?A===32?n.info.codec="pcm-f32":A===64?n.info.codec="pcm-f64":(M._warn(`Invalid fpcm sample size ${A}.`),n.info.codec=null):A===32?n.info.codec="pcm-f32be":A===64?n.info.codec="pcm-f64be":(M._warn(`Invalid fpcm sample size ${A}.`),n.info.codec=null)}else if(b==="lpcm"&&y!==null){let A=g+7>>3,S=!!(y&1),T=!!(y&2),v=y&4?-1:0;g>0&&g<=64&&(S?g===32&&(n.info.codec=T?"pcm-f32be":"pcm-f32"):v&1<<A-1?A===1?n.info.codec="pcm-s8":A===2?n.info.codec=T?"pcm-s16be":"pcm-s16":A===3?n.info.codec=T?"pcm-s24be":"pcm-s24":A===4&&(n.info.codec=T?"pcm-s32be":"pcm-s32"):A===1&&(n.info.codec="pcm-u8")),n.info.codec===null&&M._warn("Unsupported PCM format.")}else b===null?M._warn("Unknown encrypted audio codec due to missing frma box."):M._warn(`Unsupported audio codec (sample entry type '${d.name}').`)}e.filePos=u+d.totalSize}}break;case"frma":{let n=this.currentTrack;if(!n)break;let c=ge(e,4).toLowerCase();n.frmaCodecString=c}break;case"schm":{let n=this.currentTrack;if(!n)break;e.skip(4);let a=ge(e,4);a==="cenc"||a==="cens"||a==="cbcs"?n.encryptionInfo={scheme:a,defaultKid:null,defaultIsProtected:null,defaultPerSampleIvSize:null,defaultConstantIv:null,defaultCryptByteBlock:null,defaultSkipByteBlock:null}:M._warn(`Unsupported encryption scheme '${a}'.`)}break;case"tenc":{let n=this.currentTrack;if(!n||!n.encryptionInfo)break;let a=D(e);e.skip(3),e.skip(1);let c=D(e);if(a>0?(n.encryptionInfo.defaultCryptByteBlock=c>>4,n.encryptionInfo.defaultSkipByteBlock=c&15):(n.encryptionInfo.defaultCryptByteBlock=0,n.encryptionInfo.defaultSkipByteBlock=0),n.encryptionInfo.defaultIsProtected=D(e)!==0,n.encryptionInfo.defaultPerSampleIvSize=D(e),n.encryptionInfo.defaultKid=nt(q(e,16)),n.encryptionInfo.defaultIsProtected&&n.encryptionInfo.defaultPerSampleIvSize===0){let l=D(e),u=new Uint8Array(16);u.set(q(e,l),0),n.encryptionInfo.defaultConstantIv=u}}break;case"avcC":{let n=this.currentTrack;if(!n)break;p(n.info),n.info.codecDescription=q(e,i.contentSize)}break;case"hvcC":{let n=this.currentTrack;if(!n)break;p(n.info),n.info.codecDescription=q(e,i.contentSize)}break;case"vpcC":{let n=this.currentTrack;if(!n)break;p(n.info?.type==="video"),e.skip(4);let a=D(e),c=D(e),l=D(e),u=l>>4,d=l>>1&7,f=l&1,h=D(e),m=D(e),g=D(e);n.info.vp9CodecInfo={profile:a,level:c,bitDepth:u,chromaSubsampling:d,videoFullRangeFlag:f,colourPrimaries:h,transferCharacteristics:m,matrixCoefficients:g}}break;case"av1C":{let n=this.currentTrack;if(!n)break;p(n.info?.type==="video"),e.skip(1);let a=D(e),c=a>>5,l=a&31,u=D(e),d=u>>7,f=u>>6&1,h=u>>5&1,m=u>>4&1,g=u>>3&1,w=u>>2&1,y=u&3,b=c===2&&f?h?12:10:f?10:8;n.info.av1CodecInfo={profile:c,level:l,tier:d,bitDepth:b,monochrome:m,chromaSubsamplingX:g,chromaSubsamplingY:w,chromaSamplePosition:y}}break;case"colr":{let n=this.currentTrack;if(!n)break;p(n.info?.type==="video");let a=ge(e,4);if(a!=="nclx"&&a!=="nclc")break;let c=se(e),l=se(e),u=se(e),d;a==="nclx"&&(d=!!(D(e)&128)),n.info.colorSpace={primaries:Bn[c],transfer:Rn[l],matrix:Fn[u],fullRange:d}}break;case"pasp":{let n=this.currentTrack;if(!n)break;p(n.info?.type==="video");let a=E(e),c=E(e);a>0&&c>0&&(a>c?n.info.squarePixelWidth=Math.round(n.info.width*a/c):n.info.squarePixelHeight=Math.round(n.info.height*c/a))}break;case"wave":this.readContiguousBoxes(e.slice(s,i.contentSize));break;case"esds":{let n=this.currentTrack;if(!n)break;p(n.info?.type==="audio"),e.skip(4);let a=D(e);p(a===3),Hr(e),e.skip(2);let c=D(e),l=(c&128)!==0,u=(c&64)!==0,d=(c&32)!==0;if(l&&e.skip(2),u){let w=D(e);e.skip(w)}d&&e.skip(2);let f=D(e);p(f===4);let h=Hr(e),m=e.filePos,g=D(e);if(g===64||g===103?(n.info.codec="aac",n.info.aacCodecInfo={isMpeg2:g===103,objectType:null}):g===105||g===107?n.info.codec="mp3":g===221?n.info.codec="vorbis":M._warn(`Unsupported audio codec (objectTypeIndication ${g}) - discarding track.`),e.skip(12),h>e.filePos-m){let w=D(e);p(w===5);let y=Hr(e);if(n.info.codecDescription=q(e,y),n.info.codec==="aac"){let b=zt(n.info.codecDescription);b.numberOfChannels!==null&&(n.info.numberOfChannels=b.numberOfChannels),b.sampleRate!==null&&(n.info.sampleRate=b.sampleRate)}}}break;case"enda":{let n=this.currentTrack;if(!n)break;p(n.info?.type==="audio"),n.info.pcmLittleEndian=!!(se(e)&255)}break;case"pcmC":{let n=this.currentTrack;if(!n)break;p(n.info?.type==="audio"),e.skip(4);let a=D(e);n.info.pcmLittleEndian=!!(a&1),n.info.pcmSampleSize=D(e)}break;case"dOps":{let n=this.currentTrack;if(!n)break;p(n.info?.type==="audio"),e.skip(1);let a=D(e),c=se(e),l=E(e),u=Hs(e),d=D(e),f;d!==0?f=q(e,2+a):f=new Uint8Array(0);let h=new Uint8Array(19+f.byteLength),m=new DataView(h.buffer);m.setUint32(0,1332770163,!1),m.setUint32(4,1214603620,!1),m.setUint8(8,1),m.setUint8(9,a),m.setUint16(10,c,!0),m.setUint32(12,l,!0),m.setInt16(16,u,!0),m.setUint8(18,d),h.set(f,19),n.info.codecDescription=h,n.info.numberOfChannels=a}break;case"dfLa":{let n=this.currentTrack;if(!n)break;p(n.info?.type==="audio"),e.skip(4);let a=127,c=128,l=e.filePos;for(;e.filePos<o;){let m=D(e),g=$e(e);if((m&a)===Or.STREAMINFO){e.skip(10);let y=E(e),b=y>>>12,A=(y>>9&7)+1;n.info.sampleRate=b,n.info.numberOfChannels=A,e.skip(20)}else e.skip(g);if(m&c)break}let u=e.filePos;e.filePos=l;let d=q(e,u-l),f=new Uint8Array(4+d.byteLength);new DataView(f.buffer).setUint32(0,1716281667,!1),f.set(d,4),n.info.codecDescription=f}break;case"dac3":{let n=this.currentTrack;if(!n)break;p(n.info?.type==="audio");let a=q(e,3),c=new H(a),l=c.readBits(2);c.skipBits(8);let u=c.readBits(3),d=c.readBits(1);l<3&&(n.info.sampleRate=dr[l]),n.info.numberOfChannels=Wi[u]+d}break;case"dec3":{let n=this.currentTrack;if(!n)break;p(n.info?.type==="audio");let a=q(e,i.contentSize),c=Ps(a);if(!c){M._warn("Invalid dec3 box contents, ignoring.");break}let l=Bs(c);l!==null&&(n.info.sampleRate=l),n.info.numberOfChannels=Rs(c)}break;case"stts":{let n=this.currentTrack;if(!n||!n.sampleTable)break;e.skip(4);let a=E(e),c=0,l=0;for(let u=0;u<a;u++){let d=E(e),f=E(e);n.sampleTable.sampleTimingEntries.push({startIndex:c,startDecodeTimestamp:l,count:d,delta:f}),c+=d,l+=d*f}}break;case"ctts":{let n=this.currentTrack;if(!n||!n.sampleTable)break;e.skip(4);let a=E(e),c=0;for(let l=0;l<a;l++){let u=E(e),d=Ke(e);n.sampleTable.sampleCompositionTimeOffsets.push({startIndex:c,count:u,offset:d}),c+=u}}break;case"stsz":{let n=this.currentTrack;if(!n||!n.sampleTable)break;e.skip(4);let a=E(e),c=E(e);if(a===0)for(let l=0;l<c;l++){let u=E(e);n.sampleTable.sampleSizes.push(u)}else n.sampleTable.sampleSizes.push(a)}break;case"stz2":{let n=this.currentTrack;if(!n||!n.sampleTable)break;e.skip(4),e.skip(3);let a=D(e),c=E(e),l=q(e,Math.ceil(c*a/8)),u=new H(l);for(let d=0;d<c;d++){let f=u.readBits(a);n.sampleTable.sampleSizes.push(f)}}break;case"stss":{let n=this.currentTrack;if(!n||!n.sampleTable)break;e.skip(4),n.sampleTable.keySampleIndices=[];let a=E(e);for(let c=0;c<a;c++){let l=E(e)-1;n.sampleTable.keySampleIndices.push(l)}n.sampleTable.keySampleIndices[0]!==0&&n.sampleTable.keySampleIndices.unshift(0)}break;case"stsc":{let n=this.currentTrack;if(!n||!n.sampleTable)break;e.skip(4);let a=E(e);for(let l=0;l<a;l++){let u=E(e)-1,d=E(e),f=E(e);n.sampleTable.sampleToChunk.push({startSampleIndex:-1,startChunkIndex:u,samplesPerChunk:d,sampleDescriptionIndex:f})}let c=0;for(let l=0;l<n.sampleTable.sampleToChunk.length;l++)if(n.sampleTable.sampleToChunk[l].startSampleIndex=c,l<n.sampleTable.sampleToChunk.length-1){let d=n.sampleTable.sampleToChunk[l+1].startChunkIndex-n.sampleTable.sampleToChunk[l].startChunkIndex;c+=d*n.sampleTable.sampleToChunk[l].samplesPerChunk}}break;case"stco":{let n=this.currentTrack;if(!n||!n.sampleTable)break;e.skip(4);let a=E(e);for(let c=0;c<a;c++){let l=E(e);n.sampleTable.chunkOffsets.push(l)}}break;case"co64":{let n=this.currentTrack;if(!n||!n.sampleTable)break;e.skip(4);let a=E(e);for(let c=0;c<a;c++){let l=pe(e);n.sampleTable.chunkOffsets.push(l)}}break;case"mvex":this.isFragmented=!0,this.readContiguousBoxes(e.slice(s,i.contentSize));break;case"mehd":{let n=D(e);e.skip(3);let a=n===1?pe(e):E(e);this.movieDurationInTimescale=a}break;case"trex":{e.skip(4);let n=E(e),a=E(e),c=E(e),l=E(e),u=E(e);this.fragmentTrackDefaults.push({trackId:n,defaultSampleDescriptionIndex:a,defaultSampleDuration:c,defaultSampleSize:l,defaultSampleFlags:u})}break;case"tfra":{let n=D(e);e.skip(3);let a=E(e),c=this.tracks.find(b=>b.id===a);if(!c)break;let l=E(e),u=(l&48)>>4,d=(l&12)>>2,f=l&3,h=[D,se,$e,E],m=h[u],g=h[d],w=h[f],y=E(e);for(let b=0;b<y;b++){let A=n===1?pe(e):E(e),S=n===1?pe(e):E(e);m(e),g(e),w(e),c.fragmentLookupTable.push({timestamp:A,moofOffset:S})}c.fragmentLookupTable.sort((b,A)=>b.timestamp-A.timestamp);for(let b=0;b<c.fragmentLookupTable.length-1;b++){let A=c.fragmentLookupTable[b],S=c.fragmentLookupTable[b+1];A.timestamp===S.timestamp&&(c.fragmentLookupTable.splice(b+1,1),b--)}}break;case"moof":this.currentFragment={moofOffset:r,moofSize:i.totalSize,implicitBaseDataOffset:r,trackData:new Map,psshBoxes:[]},this.readContiguousBoxes(e.slice(s,i.contentSize)),this.lastReadFragment=this.currentFragment,this.currentFragment=null;break;case"traf":if(p(this.currentFragment),this.readContiguousBoxes(e.slice(s,i.contentSize)),this.currentTrack){let n=this.currentFragment.trackData.get(this.currentTrack.id);e:if(n){if(n.samples.length===0){this.currentFragment.trackData.delete(this.currentTrack.id);break e}n.presentationTimestamps=n.samples.map((u,d)=>({presentationTimestamp:u.presentationTimestamp,sampleIndex:d})).sort((u,d)=>u.presentationTimestamp-d.presentationTimestamp);for(let u=0;u<n.presentationTimestamps.length;u++){let d=n.presentationTimestamps[u],f=n.samples[d.sampleIndex];if(n.firstKeyFrameTimestamp===null&&f.isKeyFrame&&(n.firstKeyFrameTimestamp=f.presentationTimestamp),u<n.presentationTimestamps.length-1){let m=n.presentationTimestamps[u+1].presentationTimestamp-d.presentationTimestamp;f.duration=m}}let a=n.samples[n.presentationTimestamps[0].sampleIndex],c=n.samples[X(n.presentationTimestamps).sampleIndex];n.startTimestamp=a.presentationTimestamp,n.endTimestamp=c.presentationTimestamp+c.duration;let{currentFragmentState:l}=this.currentTrack;p(l),l.startTimestamp!==null&&(Hi(n,l.startTimestamp),n.startTimestampIsFinal=!0),l.encryptionAuxInfo&&!n.samples[0].encryption&&(n.encryptionAuxInfo=l.encryptionAuxInfo)}this.currentTrack.currentFragmentState=null,this.currentTrack=null}break;case"pssh":{if(this.input._formatOptions.isobmff?._suppressPsshParsing)break;let n=Fs(q(e,i.contentSize));this.currentFragment?this.currentFragment.psshBoxes.push(n):this.currentTrack||this.psshBoxes.push(n)}break;case"tfhd":{p(this.currentFragment),e.skip(1);let n=$e(e),a=!!(n&1),c=!!(n&2),l=!!(n&8),u=!!(n&16),d=!!(n&32),f=!!(n&65536),h=!!(n&131072),m=E(e),g=this.tracks.find(y=>y.id===m);if(!g)break;let w=this.fragmentTrackDefaults.find(y=>y.trackId===m);this.currentTrack=g,g.currentFragmentState={baseDataOffset:this.currentFragment.implicitBaseDataOffset,sampleDescriptionIndex:w?.defaultSampleDescriptionIndex??null,defaultSampleDuration:w?.defaultSampleDuration??null,defaultSampleSize:w?.defaultSampleSize??null,defaultSampleFlags:w?.defaultSampleFlags??null,startTimestamp:null,encryptionAuxInfo:null},a?g.currentFragmentState.baseDataOffset=pe(e):h&&(g.currentFragmentState.baseDataOffset=this.currentFragment.moofOffset),c&&(g.currentFragmentState.sampleDescriptionIndex=E(e)),l&&(g.currentFragmentState.defaultSampleDuration=E(e)),u&&(g.currentFragmentState.defaultSampleSize=E(e)),d&&(g.currentFragmentState.defaultSampleFlags=E(e)),f&&(g.currentFragmentState.defaultSampleDuration=0)}break;case"tfdt":{let n=this.currentTrack;if(!n)break;p(n.currentFragmentState);let a=D(e);e.skip(3);let c=a===0?E(e):pe(e);n.currentFragmentState.startTimestamp=c}break;case"trun":{let n=this.currentTrack;if(!n)break;p(this.currentFragment),p(n.currentFragmentState);let a=D(e),c=$e(e),l=!!(c&1),u=!!(c&4),d=!!(c&256),f=!!(c&512),h=!!(c&1024),m=!!(c&2048),g=E(e),w=null;l&&(w=Ke(e));let y=null;u&&(y=E(e));let b;this.currentFragment.trackData.has(n.id)?(b=this.currentFragment.trackData.get(n.id),w!==null&&(b.currentOffset=n.currentFragmentState.baseDataOffset+w)):(b={track:n,currentTimestamp:0,currentOffset:n.currentFragmentState.baseDataOffset+(w??0),startTimestamp:0,endTimestamp:0,firstKeyFrameTimestamp:null,samples:[],presentationTimestamps:[],startTimestampIsFinal:!1,encryptionAuxInfo:null},this.currentFragment.trackData.set(n.id,b));for(let A=0;A<g;A++){let S;d?S=E(e):(p(n.currentFragmentState.defaultSampleDuration!==null),S=n.currentFragmentState.defaultSampleDuration);let T;f?T=E(e):(p(n.currentFragmentState.defaultSampleSize!==null),T=n.currentFragmentState.defaultSampleSize);let v;h?v=E(e):(p(n.currentFragmentState.defaultSampleFlags!==null),v=n.currentFragmentState.defaultSampleFlags),A===0&&y!==null&&(v=y);let I=0;m&&(a===0?I=E(e):I=Ke(e));let _=!(v&65536);b.samples.push({presentationTimestamp:b.currentTimestamp+I,duration:S,byteOffset:b.currentOffset,byteSize:T,isKeyFrame:_,encryption:null}),b.currentOffset+=T,b.currentTimestamp+=S}this.currentFragment.implicitBaseDataOffset=b.currentOffset}break;case"saiz":{let n=this.currentTrack;if(!n||!n.encryptionInfo)break;if(e.skip(1),$e(e)&1){let f=ge(e,4),h=E(e);if(f!==n.encryptionInfo.scheme||h!==0)break}let c=D(e),l=E(e),u=null;c===0&&l>0&&(u=q(e,l));let d=Us(n);d.defaultSampleInfoSize=c,d.sampleSizes=u,d.sampleCount=l}break;case"saio":{let n=this.currentTrack;if(!n||!n.encryptionInfo)break;let a=D(e);if($e(e)&1){let f=ge(e,4),h=E(e);if(f!==n.encryptionInfo.scheme||h!==0)break}let l=E(e);if(l===0)break;l>1&&M._warn("Multiple saio entries are not supported; using the first offset only.");let u=a===0?E(e):Number(pe(e));this.currentFragment&&(u+=this.currentFragment.moofOffset);let d=Us(n);d.offset=u}break;case"senc":{let n=this.currentTrack;if(!n||!n.encryptionInfo)break;p(this.currentFragment);let a=this.currentFragment.trackData.get(n.id);if(!a)break;e.skip(1);let l=!!($e(e)&2),u=E(e),d=n.encryptionInfo.defaultPerSampleIvSize;p(d!==null);for(let f=0;f<Math.min(u,a.samples.length);f++){let h=new Uint8Array(16);d>0?h.set(q(e,d),0):h.set(n.encryptionInfo.defaultConstantIv,0);let m=null;if(l){let w=se(e);m=[];for(let y=0;y<w;y++){let b=se(e),A=E(e);m.push({clearLen:b,protectedLen:A})}}let g=a.samples[f];g.encryption={iv:h,subsamples:m}}}break;case"udta":{let n=this.iterateContiguousBoxes(e.slice(s,i.contentSize));for(let{boxInfo:a,slice:c}of n){if(a.name!=="meta"&&!this.currentTrack){let l=c.filePos;this.metadataTags.raw??={},a.name[0]==="\xA9"?this.metadataTags.raw[a.name]??=ve(c):this.metadataTags.raw[a.name]??=q(c,a.contentSize),c.filePos=l}switch(a.name){case"meta":c.skip(-a.headerSize),this.traverseBox(c);break;case"\xA9nam":case"name":this.currentTrack?this.currentTrack.name=it.decode(q(c,a.contentSize)):this.metadataTags.title??=ve(c);break;case"\xA9des":this.currentTrack||(this.metadataTags.description??=ve(c));break;case"\xA9ART":this.currentTrack||(this.metadataTags.artist??=ve(c));break;case"\xA9alb":this.currentTrack||(this.metadataTags.album??=ve(c));break;case"albr":this.currentTrack||(this.metadataTags.albumArtist??=ve(c));break;case"\xA9gen":this.currentTrack||(this.metadataTags.genre??=ve(c));break;case"\xA9day":if(!this.currentTrack){let l=new Date(ve(c));Number.isNaN(l.getTime())||(this.metadataTags.date??=l)}break;case"\xA9cmt":this.currentTrack||(this.metadataTags.comment??=ve(c));break;case"\xA9lyr":this.currentTrack||(this.metadataTags.lyrics??=ve(c));break}}}break;case"meta":{if(this.currentTrack)break;let a=E(e)!==0;this.currentMetadataKeys=new Map,a?this.readContiguousBoxes(e.slice(s,i.contentSize)):this.readContiguousBoxes(e.slice(s+4,i.contentSize-4)),this.currentMetadataKeys=null}break;case"keys":{if(!this.currentMetadataKeys)break;e.skip(4);let n=E(e);for(let a=0;a<n;a++){let c=E(e);e.skip(4);let l=it.decode(q(e,c-8));this.currentMetadataKeys.set(a+1,l)}}break;case"ilst":{if(!this.currentMetadataKeys)break;let n=this.iterateContiguousBoxes(e.slice(s,i.contentSize));for(let{boxInfo:a,slice:c}of n){let l=a.name,u=(l.charCodeAt(0)<<24)+(l.charCodeAt(1)<<16)+(l.charCodeAt(2)<<8)+l.charCodeAt(3);this.currentMetadataKeys.has(u)&&(l=this.currentMetadataKeys.get(u));let d=zs(c);switch(this.metadataTags.raw??={},this.metadataTags.raw[l]??=d,l){case"\xA9nam":case"titl":case"com.apple.quicktime.title":case"title":typeof d=="string"&&(this.metadataTags.title??=d);break;case"\xA9des":case"desc":case"dscp":case"com.apple.quicktime.description":case"description":typeof d=="string"&&(this.metadataTags.description??=d);break;case"\xA9ART":case"com.apple.quicktime.artist":case"artist":typeof d=="string"&&(this.metadataTags.artist??=d);break;case"\xA9alb":case"albm":case"com.apple.quicktime.album":case"album":typeof d=="string"&&(this.metadataTags.album??=d);break;case"aART":case"album_artist":typeof d=="string"&&(this.metadataTags.albumArtist??=d);break;case"\xA9cmt":case"com.apple.quicktime.comment":case"comment":typeof d=="string"&&(this.metadataTags.comment??=d);break;case"\xA9gen":case"gnre":case"com.apple.quicktime.genre":case"genre":typeof d=="string"&&(this.metadataTags.genre??=d);break;case"\xA9lyr":case"lyrics":typeof d=="string"&&(this.metadataTags.lyrics??=d);break;case"\xA9day":case"rldt":case"com.apple.quicktime.creationdate":case"date":if(typeof d=="string"){let f=new Date(d);Number.isNaN(f.getTime())||(this.metadataTags.date??=f)}break;case"covr":case"com.apple.quicktime.artwork":d instanceof ke?(this.metadataTags.images??=[],this.metadataTags.images.push({data:d.data,kind:"coverFront",mimeType:d.mimeType})):d instanceof Uint8Array&&(this.metadataTags.images??=[],this.metadataTags.images.push({data:d,kind:"coverFront",mimeType:"image/*"}));break;case"track":if(typeof d=="string"){let f=d.split("/"),h=Number.parseInt(f[0],10),m=f[1]&&Number.parseInt(f[1],10);Number.isInteger(h)&&h>0&&(this.metadataTags.trackNumber??=h),m&&Number.isInteger(m)&&m>0&&(this.metadataTags.tracksTotal??=m)}break;case"trkn":if(d instanceof Uint8Array&&d.length>=6){let f=L(d),h=f.getUint16(2,!1),m=f.getUint16(4,!1);h>0&&(this.metadataTags.trackNumber??=h),m>0&&(this.metadataTags.tracksTotal??=m)}break;case"disc":case"disk":if(d instanceof Uint8Array&&d.length>=6){let f=L(d),h=f.getUint16(2,!1),m=f.getUint16(4,!1);h>0&&(this.metadataTags.discNumber??=h),m>0&&(this.metadataTags.discsTotal??=m)}break}}}break}return e.filePos=o,!0}},Qr=class{constructor(e){this.internalTrack=e,this.packetToSampleIndex=new WeakMap,this.packetToFragmentLocation=new WeakMap}getId(){return this.internalTrack.id}getNumber(){let e=this.internalTrack.demuxer,r=this.internalTrack.trackBacking.getType(),i=0;for(let s of e.tracks)if(s.trackBacking.getType()===r&&i++,s===this.internalTrack)break;return i}getCodec(){throw new Error("Not implemented on base class.")}getInternalCodecId(){return this.internalTrack.internalCodecId}getName(){return this.internalTrack.name}getLanguageCode(){return this.internalTrack.languageCode}getTimeResolution(){return this.internalTrack.timescale}isRelativeToUnixEpoch(){return!1}getUnixTimeForTimestamp(){return null}getDisposition(){return this.internalTrack.disposition}getPairingMask(){return 1n}getBitrate(){return null}getAverageBitrate(){return null}async getDurationFromMetadata(){let e=this.internalTrack;return e.durationInMediaTimescale<=0?null:(p(e.trackBacking),((await e.trackBacking.getFirstPacket({metadataOnly:!0}))?.timestamp??0)+e.durationInMediaTimescale/e.timescale)}async getLiveRefreshInterval(){return null}async getFirstPacket(e){let r=await this.fetchPacketForSampleIndex(0,e);return r||!this.internalTrack.demuxer.isFragmented?r:this.performFragmentedLookup(null,i=>i.trackData.get(this.internalTrack.id)?{sampleIndex:0,correctSampleFound:!0}:{sampleIndex:-1,correctSampleFound:!1},-1/0,1/0,e)}mapTimestampIntoTimescale(e){return Nn(e*this.internalTrack.timescale)+this.internalTrack.editListOffset}async getPacket(e,r){let i=this.mapTimestampIntoTimescale(e),s=this.internalTrack.demuxer.getSampleTableForTrack(this.internalTrack),o=qi(s,i),n=await this.fetchPacketForSampleIndex(o,r);return!Vs(s)||!this.internalTrack.demuxer.isFragmented?n:this.performFragmentedLookup(null,a=>{let c=a.trackData.get(this.internalTrack.id);if(!c)return{sampleIndex:-1,correctSampleFound:!1};let l=Q(c.presentationTimestamps,i,f=>f.presentationTimestamp),u=l!==-1?c.presentationTimestamps[l].sampleIndex:-1,d=l!==-1&&i<c.endTimestamp;return{sampleIndex:u,correctSampleFound:d}},i,i,r)}async getNextPacket(e,r){let i=this.packetToSampleIndex.get(e);if(i!==void 0)return this.fetchPacketForSampleIndex(i+1,r);let s=this.packetToFragmentLocation.get(e);if(s===void 0)throw new Error("Packet was not created from this track.");return this.performFragmentedLookup(s.fragment,o=>{if(o===s.fragment){let n=o.trackData.get(this.internalTrack.id);if(s.sampleIndex+1<n.samples.length)return{sampleIndex:s.sampleIndex+1,correctSampleFound:!0}}else if(o.trackData.get(this.internalTrack.id))return{sampleIndex:0,correctSampleFound:!0};return{sampleIndex:-1,correctSampleFound:!1}},-1/0,1/0,r)}async getKeyPacket(e,r){let i=this.mapTimestampIntoTimescale(e),s=this.internalTrack.demuxer.getSampleTableForTrack(this.internalTrack),o=na(s,i),n=await this.fetchPacketForSampleIndex(o,r);return!Vs(s)||!this.internalTrack.demuxer.isFragmented?n:this.performFragmentedLookup(null,a=>{let c=a.trackData.get(this.internalTrack.id);if(!c)return{sampleIndex:-1,correctSampleFound:!1};let l=Dn(c.presentationTimestamps,f=>c.samples[f.sampleIndex].isKeyFrame&&f.presentationTimestamp<=i),u=l!==-1?c.presentationTimestamps[l].sampleIndex:-1,d=l!==-1&&i<c.endTimestamp;return{sampleIndex:u,correctSampleFound:d}},i,i,r)}async getNextKeyPacket(e,r){let i=this.packetToSampleIndex.get(e);if(i!==void 0){let o=this.internalTrack.demuxer.getSampleTableForTrack(this.internalTrack),n=oa(o,i);return this.fetchPacketForSampleIndex(n,r)}let s=this.packetToFragmentLocation.get(e);if(s===void 0)throw new Error("Packet was not created from this track.");return this.performFragmentedLookup(s.fragment,o=>{if(o===s.fragment){let a=o.trackData.get(this.internalTrack.id).samples.findIndex((c,l)=>c.isKeyFrame&&l>s.sampleIndex);if(a!==-1)return{sampleIndex:a,correctSampleFound:!0}}else{let n=o.trackData.get(this.internalTrack.id);if(n&&n.firstKeyFrameTimestamp!==null){let a=n.samples.findIndex(c=>c.isKeyFrame);return p(a!==-1),{sampleIndex:a,correctSampleFound:!0}}}return{sampleIndex:-1,correctSampleFound:!1}},-1/0,1/0,r)}async fetchPacketForSampleIndex(e,r){if(e===-1)return null;let i=this.internalTrack.demuxer.getSampleTableForTrack(this.internalTrack),s=sa(i,e);if(!s)return null;let o;if(r.metadataOnly)o=hr;else{let l=this.internalTrack.demuxer.reader.requestSlice(s.sampleOffset,s.sampleSize);if(l instanceof Promise&&(l=await l),!l)return null;if(o=q(l,s.sampleSize),this.internalTrack.encryptionAuxInfo){p(this.internalTrack.encryptionInfo);let u=await Ws(this.internalTrack.demuxer.reader,this.internalTrack.encryptionInfo,this.internalTrack.encryptionAuxInfo);e<u.length&&(o=await Ls(this.internalTrack,u[e],o,null))}}let n=(s.presentationTimestamp-this.internalTrack.editListOffset)/this.internalTrack.timescale,a=s.duration/this.internalTrack.timescale,c=new ee(o,s.isKeyFrame?"key":"delta",n,a,e,s.sampleSize);return this.packetToSampleIndex.set(c,e),c}async fetchPacketInFragment(e,r,i){if(r===-1)return null;let o=e.trackData.get(this.internalTrack.id).samples[r];p(o);let n;if(i.metadataOnly)n=hr;else{let u=this.internalTrack.demuxer.reader.requestSlice(o.byteOffset,o.byteSize);if(u instanceof Promise&&(u=await u),!u)return null;n=q(u,o.byteSize),o.encryption&&(n=await Ls(this.internalTrack,o.encryption,n,e))}let a=(o.presentationTimestamp-this.internalTrack.editListOffset)/this.internalTrack.timescale,c=o.duration/this.internalTrack.timescale,l=new ee(n,o.isKeyFrame?"key":"delta",a,c,e.moofOffset+r,o.byteSize);return this.packetToFragmentLocation.set(l,{fragment:e,sampleIndex:r}),l}async performFragmentedLookup(e,r,i,s,o){let n=this.internalTrack.demuxer,a=null,c=null,l=-1;if(e){let{sampleIndex:w,correctSampleFound:y}=r(e);if(y)return this.fetchPacketInFragment(e,w,o);w!==-1&&(c=e,l=w)}let u=Q(this.internalTrack.fragmentLookupTable,i,w=>w.timestamp),d=u!==-1?this.internalTrack.fragmentLookupTable[u]:null,f=Q(this.internalTrack.fragmentPositionCache,i,w=>w.startTimestamp),h=f!==-1?this.internalTrack.fragmentPositionCache[f]:null,m=Math.max(d?.moofOffset??0,h?.moofOffset??0)||null,g;for(e?m===null||e.moofOffset>=m?(g=e.moofOffset+e.moofSize,a=e):g=m:g=m??0;;){if(a){let A=a.trackData.get(this.internalTrack.id);if(A&&A.startTimestamp>s)break}let w=n.reader.requestSliceRange(g,Ee,je);if(w instanceof Promise&&(w=await w),!w)break;let y=g,b=Qe(w);if(!b)break;if(b.name==="moof"){a=await n.readFragment(y);let{sampleIndex:A,correctSampleFound:S}=r(a);if(S)return this.fetchPacketInFragment(a,A,o);A!==-1&&(c=a,l=A)}g=y+b.totalSize}if(d&&(!c||c.moofOffset<d.moofOffset)){let w=this.internalTrack.fragmentLookupTable[u-1];p(!w||w.timestamp<d.timestamp);let y=w?.timestamp??-1/0;return this.performFragmentedLookup(null,r,y,s,o)}return c?this.fetchPacketInFragment(c,l,o):null}},Kr=class extends Qr{constructor(e){super(e),this.decoderConfigPromise=null,this.internalTrack=e}getType(){return"video"}getCodec(){return this.internalTrack.info.codec}getCodedWidth(){return this.internalTrack.info.width}getCodedHeight(){return this.internalTrack.info.height}getSquarePixelWidth(){return this.internalTrack.info.squarePixelWidth}getSquarePixelHeight(){return this.internalTrack.info.squarePixelHeight}getRotation(){return this.internalTrack.rotation}async getColorSpace(){return{primaries:this.internalTrack.info.colorSpace?.primaries,transfer:this.internalTrack.info.colorSpace?.transfer,matrix:this.internalTrack.info.colorSpace?.matrix,fullRange:this.internalTrack.info.colorSpace?.fullRange}}async canBeTransparent(){return this.internalTrack.info.codec==="prores"&&(this.internalTrack.info.proresFormat==="ap4h"||this.internalTrack.info.proresFormat==="ap4x")}async getDecoderConfig(){return this.internalTrack.info.codec?this.decoderConfigPromise??=(async()=>{if(this.internalTrack.info.codec==="vp9"&&!this.internalTrack.info.vp9CodecInfo){let r=await this.getFirstPacket({});this.internalTrack.info.vp9CodecInfo=r&&Ss(r.data)}else if(this.internalTrack.info.codec==="av1"&&!this.internalTrack.info.av1CodecInfo){let r=await this.getFirstPacket({});this.internalTrack.info.av1CodecInfo=r&&Cs(r.data)}let e={codec:rs(this.internalTrack.info),codedWidth:this.internalTrack.info.width,codedHeight:this.internalTrack.info.height,description:this.internalTrack.info.codecDescription??void 0,colorSpace:this.internalTrack.info.colorSpace??void 0};return(this.internalTrack.info.width!==this.internalTrack.info.squarePixelWidth||this.internalTrack.info.height!==this.internalTrack.info.squarePixelHeight)&&(e.displayAspectWidth=this.internalTrack.info.squarePixelWidth,e.displayAspectHeight=this.internalTrack.info.squarePixelHeight),e})():null}},Gr=class extends Qr{constructor(e){super(e),this.decoderConfig=null,this.internalTrack=e}getType(){return"audio"}getCodec(){return this.internalTrack.info.codec}getNumberOfChannels(){return this.internalTrack.info.numberOfChannels}getSampleRate(){return this.internalTrack.info.sampleRate}async getDecoderConfig(){return this.internalTrack.info.codec?this.decoderConfig??={codec:ns(this.internalTrack.info),numberOfChannels:this.internalTrack.info.numberOfChannels,sampleRate:this.internalTrack.info.sampleRate,description:this.internalTrack.info.codecDescription??void 0}:null}},qi=(t,e)=>{if(t.presentationTimestamps){let r=Q(t.presentationTimestamps,e,i=>i.presentationTimestamp);return r===-1?-1:t.presentationTimestamps[r].sampleIndex}else{let r=Q(t.sampleTimingEntries,e,s=>s.startDecodeTimestamp);if(r===-1)return-1;let i=t.sampleTimingEntries[r];return i.startIndex+Math.min(Math.floor((e-i.startDecodeTimestamp)/i.delta),i.count-1)}},na=(t,e)=>{if(!t.keySampleIndices)return qi(t,e);if(t.presentationTimestamps){let r=Q(t.presentationTimestamps,e,i=>i.presentationTimestamp);if(r===-1)return-1;for(let i=r;i>=0;i--){let s=t.presentationTimestamps[i].sampleIndex;if(Ii(t.keySampleIndices,s,n=>n)!==-1)return s}return-1}else{let r=qi(t,e),i=Q(t.keySampleIndices,r,s=>s);return t.keySampleIndices[i]??-1}},sa=(t,e)=>{let r=Q(t.sampleTimingEntries,e,y=>y.startIndex),i=t.sampleTimingEntries[r];if(!i||i.startIndex+i.count<=e)return null;let o=i.startDecodeTimestamp+(e-i.startIndex)*i.delta,n=Q(t.sampleCompositionTimeOffsets,e,y=>y.startIndex),a=t.sampleCompositionTimeOffsets[n];a&&e-a.startIndex<a.count&&(o+=a.offset);let c=t.sampleSizes[Math.min(e,t.sampleSizes.length-1)],l=Q(t.sampleToChunk,e,y=>y.startSampleIndex),u=t.sampleToChunk[l];p(u);let d=u.startChunkIndex+Math.floor((e-u.startSampleIndex)/u.samplesPerChunk),f=t.chunkOffsets[d],h=u.startSampleIndex+(d-u.startChunkIndex)*u.samplesPerChunk,m=0,g=f;if(t.sampleSizes.length===1)g+=c*(e-h),m+=c*u.samplesPerChunk;else for(let y=h;y<h+u.samplesPerChunk;y++){let b=t.sampleSizes[y];y<e&&(g+=b),m+=b}let w=i.delta;if(t.presentationTimestamps){let y=t.presentationTimestampIndexMap[e];p(y!==void 0),y<t.presentationTimestamps.length-1&&(w=t.presentationTimestamps[y+1].presentationTimestamp-o)}return{presentationTimestamp:o,duration:w,sampleOffset:g,sampleSize:c,chunkOffset:f,chunkSize:m,isKeyFrame:t.keySampleIndices?Ii(t.keySampleIndices,e,y=>y)!==-1:!0}},oa=(t,e)=>{if(!t.keySampleIndices)return e+1;let r=Q(t.keySampleIndices,e,i=>i);return t.keySampleIndices[r+1]??-1},Hi=(t,e)=>{t.startTimestamp+=e,t.endTimestamp+=e;for(let r of t.samples)r.presentationTimestamp+=e;for(let r of t.presentationTimestamps)r.presentationTimestamp+=e},aa=t=>{let[e,r]=t,i=Math.atan2(r,e);return Number.isFinite(i)?i*(180/Math.PI):0},Vs=t=>t.sampleSizes.length===0,Us=t=>t.currentFragmentState?t.currentFragmentState.encryptionAuxInfo??={defaultSampleInfoSize:0,sampleSizes:null,sampleCount:0,offset:null,resolved:null}:t.encryptionAuxInfo??={defaultSampleInfoSize:0,sampleSizes:null,sampleCount:0,offset:null,resolved:null},Ws=async(t,e,r)=>{if(r.resolved)return r.resolved;if(r.offset===null||r.sampleCount===0)throw new Error("Incomplete saiz/saio info; cannot resolve encryption data.");let i=0;if(r.defaultSampleInfoSize>0)i=r.defaultSampleInfoSize*r.sampleCount;else{p(r.sampleSizes);for(let a=0;a<r.sampleCount;a++)i+=r.sampleSizes[a]}let s=t.requestSlice(r.offset,i);if(s instanceof Promise&&(s=await s),!s)throw new Error("Failed to read auxiliary encryption info.");let o=e.defaultPerSampleIvSize;p(o!==null);let n=[];for(let a=0;a<r.sampleCount;a++){let c=r.defaultSampleInfoSize>0?r.defaultSampleInfoSize:r.sampleSizes[a],l=new Uint8Array(16);o>0?l.set(q(s,o),0):l.set(e.defaultConstantIv,0);let u=null;if(c>o){let d=se(s);u=[];for(let f=0;f<d;f++){let h=se(s),m=E(s);u.push({clearLen:h,protectedLen:m})}}n.push({iv:l,subsamples:u})}return r.resolved=n,n},Ls=async(t,e,r,i)=>{p(t.encryptionInfo);let s=t.encryptionInfo;p(s.defaultKid!==null);let o=s.defaultKid,n,a=t.demuxer.decryptionKeyCache.get(o);if(a)n=await a;else{if(!t.demuxer.input._formatOptions.isobmff?.resolveKeyId)throw new Error("Encrypted media samples encountered. To decrypt them, please provide a callback for InputOptions.formatOptions.isobmff.resolveKeyId.");let c=(async()=>{let l=t.demuxer.psshBoxes;if(i){l=[...l,...i.psshBoxes].filter(d=>d.keyIds===null||d.keyIds.includes(o));for(let d=0;d<l.length-1;d++)for(let f=d+1;f<l.length;f++)Ms(l[d],l[f])&&(l.splice(f,1),f--)}let u=await t.demuxer.input._formatOptions.isobmff.resolveKeyId({keyId:o,psshBoxes:l});if(!(typeof u=="string"&&u.length===32&&zn.test(u)||u instanceof Uint8Array&&u.byteLength===16))throw new TypeError("resolveKeyId must return a 32-character hex string or a 16-byte Uint8Array containing the decryption key.");return u instanceof Uint8Array?u:On(u)})();t.demuxer.decryptionKeyCache.set(o,c),n=await c}return s.scheme==="cenc"||s.scheme==="cens"?ca(n,s,e,r):ua(n,s,e,r)},ca=async(t,e,r,i)=>{let s=new Uint8Array(16);s.set(r.iv,0);let o=await crypto.subtle.importKey("raw",t,{name:"AES-CTR"},!1,["decrypt"]),n=async m=>{let g=await crypto.subtle.decrypt({name:"AES-CTR",counter:s,length:64},o,m);return new Uint8Array(g)};if(!r.subsamples)return n(i);p(e.defaultCryptByteBlock!==null&&e.defaultSkipByteBlock!==null);let a=Ns(r.subsamples,e.defaultCryptByteBlock,e.defaultSkipByteBlock),c=0;for(let m of a)for(let g of m.perSubsample)c+=g.length;let l=new Uint8Array(c),u=0;for(let m of a)for(let g of m.perSubsample)l.set(i.subarray(g.offset,g.offset+g.length),u),u+=g.length;let d=await n(l),f=new Uint8Array(i),h=0;for(let m of a)for(let g of m.perSubsample)f.set(d.subarray(h,h+g.length),g.offset),h+=g.length;return f},ua=(t,e,r,i)=>{let s=new qr;s.init({key:t,iv:r.iv});let o=e.defaultCryptByteBlock,n=e.defaultSkipByteBlock;if(p(o!==null&&n!==null),!r.subsamples){let u=new Uint8Array(i),d=Math.floor(i.length/16);for(let f=0;f<d;f++){let h=f*16;s.in.set(i.subarray(h,h+16)),s.decrypt(),u.set(s.out,h)}return u}if(o===0&&n===0)throw new Error("cbcs with subsamples requires pattern encryption.");let a=new Uint8Array(i),c=Ns(r.subsamples,o,n),l=new DataView(r.iv.buffer,r.iv.byteOffset,16);for(let u of c){s.iv[0]=l.getUint32(0,!1),s.iv[1]=l.getUint32(4,!1),s.iv[2]=l.getUint32(8,!1),s.iv[3]=l.getUint32(12,!1);for(let d of u.perSubsample){let f=d.length/16;for(let h=0;h<f;h++){let m=d.offset+h*16;s.in.set(i.subarray(m,m+16)),s.decrypt(),a.set(s.out,m)}}}return a},Ns=(t,e,r)=>{let i=[],s=e!==0||r!==0,o=0;for(let n of t){o+=n.clearLen;let a=[];if(!s)n.protectedLen>0&&a.push({offset:o,length:n.protectedLen}),o+=n.protectedLen;else{let c=n.protectedLen,l=o;for(;c>0&&!(c<16*e);){let u=16*e;a.push({offset:l,length:u}),l+=u,c-=u;let d=Math.min(16*r,c);l+=d,c-=d}o+=n.protectedLen}i.push({perSubsample:a})}return i};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var Qs=7,Ks=9,ji=t=>{let e=t.filePos,r=q(t,9),i=new H(r);if(i.readBits(12)!==4095||(i.skipBits(1),i.readBits(2)!==0))return null;let n=i.readBits(1),a=i.readBits(2)+1,c=i.readBits(4);if(c===15)return null;i.skipBits(1);let l=i.readBits(3);if(l===0)throw new Error("ADTS frames with channel configuration 0 are not supported.");i.skipBits(1),i.skipBits(1),i.skipBits(1),i.skipBits(1);let u=i.readBits(13);i.skipBits(11);let d=i.readBits(2)+1;if(d!==1)throw new Error("ADTS frames with more than one AAC frame are not supported.");let f=null;return n===1?t.filePos-=2:f=i.readBits(16),{objectType:a,samplingFrequencyIndex:c,channelConfiguration:l,frameLength:u,numberOfAacFrames:d,crcCheck:f,startPos:e}};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */Mt();var Ki=0,Gi=1/0,la=null;typeof FinalizationRegistry<"u"&&(la=new FinalizationRegistry(t=>{t()}));var Te=class extends be{constructor(){super(),this._disposed=!1,this._refCount=0,this._usedForHls=!1,this._refFinalizationRegistry=null,this._sizePromise=null,this.onread=null,typeof FinalizationRegistry<"u"&&(this._refFinalizationRegistry=new FinalizationRegistry(e=>{e._decrementRefCount()}))}async getSizeOrNull(){if(this._disposed)throw new oe;return this._sizePromise??=(async()=>{let e=this._getFileSize();return e!==void 0||(await this._read(0,1,Ki,Gi),e=this._getFileSize(),p(e!==void 0)),e})()}async getSize(){if(this._disposed)throw new oe;let e=await this.getSizeOrNull();if(e===null)throw new Error("Cannot determine the size of an unsized source.");return e}slice(e,r){if(!Number.isInteger(e)||e<0)throw new TypeError("offset must be a non-negative integer.");if(r!==void 0&&(!Number.isInteger(r)||r<0))throw new TypeError("length, when provided, must be a non-negative integer.");return new $r(this,e,r)}_dispatchRead(e,r){this.onread?.(e,r),this._emit("read",{start:e,end:r})}ref(){return new bt(this)}_incrementRefCount(){this._refCount++}_decrementRefCount(){this._refCount--,this._refCount===0&&(this._dispose(),this._disposed=!0)}},bt=class{constructor(e){if(this._freed=!1,e._disposed)throw new Error("Cannot ref a disposed source.");e._incrementRefCount(),e._refFinalizationRegistry?.register(this,e,this),this._source=e}get source(){if(!this._source)throw new Error("Can't get source; ref has already been freed.");return this._source}get freed(){return this._freed}free(){if(this._freed)throw new Error("Illegal operation: double free on SourceRef.");let e=this.source;p(e._refCount>0),e._decrementRefCount(),e._refFinalizationRegistry?.unregister(this),this._freed=!0,this._source=null}[Symbol.dispose](){this.freed||this.free()}},mr=class extends Te{constructor(e,r){if(typeof e!="string")throw new TypeError("rootPath must be a string.");if(typeof r!="function")throw new TypeError("requestHandler must be a function.");super(),this.rootPath=e,this.requestHandler=r}_resolveRequest(e){let r=this.requestHandler(e),i=s=>{if(!(s instanceof Te||s instanceof bt))throw new TypeError("requestHandler must return or resolve to a Source or SourceRef.");let o=s instanceof Te?s.ref():s;return o.source._usedForHls||=this._usedForHls,o};return r instanceof Promise?r.then(i):i(r)}},$i=(t,e)=>t.path===e.path;var pr=class extends Te{constructor(e,r={}){if(!(e instanceof Blob))throw new TypeError("blob must be a Blob.");if(!r||typeof r!="object")throw new TypeError("options must be an object.");if(r.maxCacheSize!==void 0&&(!Rr(r.maxCacheSize)||r.maxCacheSize<0))throw new TypeError("options.maxCacheSize, when provided, must be a non-negative number.");if(r.useStreamReader!==void 0&&typeof r.useStreamReader!="boolean")throw new TypeError("options.useStreamReader, when provided, must be a boolean.");super(),this._readers=new WeakMap,this._blob=e,this._options=r,this._orchestrator=new Qi({maxCacheSize:r.maxCacheSize??8*2**20,maxWorkerCount:4,runWorker:this._runWorker.bind(this),prefetchProfile:fa.fileSystem}),this._orchestrator.fileSize=e.size}_getFileSize(){return this._orchestrator.fileSize}_read(e,r,i,s){return this._orchestrator.read(e,r,i,s)}async _runWorker(e){p(e.strictTarget);let r=this._readers.get(e);for(r===void 0&&("stream"in this._blob&&!st()&&this._options.useStreamReader!==!1?r=this._blob.slice(e.currentPos).stream().getReader():r=null,this._readers.set(e,r));e.currentPos<e.targetPos&&!e.aborted;)if(r){let{done:i,value:s}=await r.read();if(i)throw this._orchestrator.onWorkerFinished(e),new Error("Blob reader stopped unexpectedly before all requested data was read.");if(e.aborted)break;this._dispatchRead(e.currentPos,e.currentPos+s.length),this._orchestrator.supplyWorkerData(e,s)}else{let i=await this._blob.slice(e.currentPos,e.targetPos).arrayBuffer();if(e.aborted)break;this._dispatchRead(e.currentPos,e.currentPos+i.byteLength),this._orchestrator.supplyWorkerData(e,new Uint8Array(i))}this._orchestrator.signalWorkerStoppedRunning(e),e.aborted&&await r?.cancel()}_dispose(){this._orchestrator.dispose()}},da=.5*2**20;var fa={none:(t,e)=>({start:t,end:e}),fileSystem:(t,e)=>(t=Math.floor((t-65536)/65536)*65536,e=Math.ceil((e+65536)/65536)*65536,{start:t,end:e}),network:(t,e,r)=>{t=Math.max(0,Math.floor((t-65536)/65536)*65536);for(let s of r){let n=Math.max((s.startPos+s.targetPos)/2,s.targetPos-8388608);if(Pr(t,e,n,s.targetPos)){let a=s.targetPos-s.startPos,c=Math.ceil((a+1)/8388608)*8388608,l=2**Math.ceil(Math.log2(a+1)),u=Math.min(l,c);e=Math.max(e,s.startPos+u)}}return e=Math.max(e,t+da),{start:t,end:e}}},Qi=class{constructor(e){this.options=e,this.fileSize=null,this.nextAge=0,this.workers=[],this.cache=[],this.currentCacheSize=0,this.disposed=!1,this.queuedReads=[]}read(e,r,i,s){p(!this.disposed);let o=this.options.prefetchProfile(e,r,this.workers),n=Math.max(o.start,i),a=Math.min(o.end,this.fileSize??1/0,s);p(n<=e&&r<=a);let c=null,l=Q(this.cache,e,T=>T.start),u=l!==-1?this.cache[l]:null;u&&u.start<=e&&r<=u.end&&(u.age=this.nextAge++,c={bytes:u.bytes,view:u.view,offset:u.start});let d=Q(this.cache,n,T=>T.start),f=c?null:new Uint8Array(r-e),h=0,m=n,g=[];if(d!==-1){for(let T=d;T<this.cache.length;T++){let v=this.cache[T];if(v.start>=a)break;if(v.end<=n)continue;let I=Math.max(n,v.start),_=Math.min(a,v.end);if(p(I<=_),m<I&&g.push({start:m,end:I}),m=_,f){let k=Math.max(e,v.start),B=Math.min(r,v.end);if(k<B){let F=k-e;f.set(v.bytes.subarray(k-v.start,B-v.start),F),F===h&&(h=B-e)}}v.age=this.nextAge++}m<a&&g.push({start:m,end:a})}else g.push({start:n,end:a});if(f&&h>=f.length&&(c={bytes:f,view:L(f),offset:e}),g.length===0)return p(c),c;let{promise:w,resolve:y,reject:b}=Y(),A=[];for(let T of g){let v=Math.max(e,T.start),I=Math.min(r,T.end);v===T.start&&I===T.end?A.push(T):v<I&&A.push({start:v,end:I})}let S=f&&{start:e,bytes:f,holes:A,resolve:y,reject:b};e:for(let T of g){for(let _ of this.workers)if(this.checkHoleAgainstWorker(_,T,S?[S]:[])){this.checkQueuedReadsAgainstWorker(_);continue e}let v=T.end<a||this.fileSize!==null,I=this.createWorker(T.start,T.end,v);if(I)S&&(I.pendingSlices=[S]),this.runWorker(I);else{let _=Q(this.queuedReads,T.start,B=>B.hole.start),k=_!==-1?this.queuedReads[_]:null;for(k&&T.start<=k.hole.end?(k.hole.end=Math.max(k.hole.end,T.end),k.strictTarget&&=v,S&&k.pendingSlices.push(S)):(_++,k={hole:{start:T.start,end:T.end},strictTarget:v,pendingSlices:S?[S]:[],age:this.nextAge++},this.queuedReads.splice(_,0,k));_+1<this.queuedReads.length;){let B=this.queuedReads[_+1];if(B.hole.start>k.hole.end)break;k.hole.end=Math.max(k.hole.end,B.hole.end),k.pendingSlices.push(...B.pendingSlices),k.strictTarget&&=B.strictTarget,k.age=Math.min(k.age,B.age),this.queuedReads.splice(_+1,1)}}}return c?w.catch(T=>{if(!this.disposed)throw T}):(p(f),c=w.then(T=>T&&{bytes:T,view:L(T),offset:e})),c}checkHoleAgainstWorker(e,r,i){if(Pr(r.start-131072,r.start,e.currentPos,e.targetPos)){e.targetPos=Math.max(e.targetPos,r.end);for(let o=0;o<i.length;o++){let n=i[o];e.pendingSlices.includes(n)||e.pendingSlices.push(n)}return e.running||this.runWorker(e),!0}return!1}checkQueuedReadsAgainstWorker(e){let r=!1;for(let i=0;i<this.queuedReads.length;i++){let s=this.queuedReads[i];if(this.checkHoleAgainstWorker(e,s.hole,s.pendingSlices))this.queuedReads.splice(i,1),i--,r=!0;else if(r)break}}createWorker(e,r,i){if(this.workers.length>=this.options.maxWorkerCount){let o=null,n=null;for(let a=0;a<this.workers.length;a++){let c=this.workers[a];!c.running&&c.pendingSlices.length===0&&(!o||c.age<o.age)&&(n=a,o=c)}if(o)p(n!==null),p(o.pendingSlices.length===0),this.workers.splice(n,1);else return null}let s={startPos:e,currentPos:e,targetPos:r,strictTarget:i,running:!1,aborted:this.disposed,pendingSlices:[],age:this.nextAge++};return this.workers.push(s),s}runWorker(e){p(!e.running),p(e.currentPos<e.targetPos),e.running=!0,e.age=this.nextAge++,this.options.runWorker(e).catch(r=>{if(e.running=!1,e.pendingSlices.length>0)e.pendingSlices.forEach(i=>i.reject(r)),e.pendingSlices.length=0;else if(!e.aborted&&!this.disposed)throw r}).finally(()=>{if(!e.running&&this.queuedReads.length>0){let r=0;for(let o=1;o<this.queuedReads.length;o++)this.queuedReads[o].age<this.queuedReads[r].age&&(r=o);let i=this.queuedReads[r],s=this.createWorker(i.hole.start,i.hole.end,i.strictTarget);if(!s)return;this.queuedReads.splice(r,1),s.pendingSlices=i.pendingSlices,this.runWorker(s)}})}consolidateEverythingIntoOneWorker(e){let r=new Set(e.pendingSlices);for(let i=0;i<this.workers.length;i++){let s=this.workers[i];if(s!==e){for(let o of s.pendingSlices)r.add(o);s.aborted=!0,s.pendingSlices.length=0,this.workers.splice(i,1),i--}}for(let i=0;i<this.queuedReads.length;i++){let s=this.queuedReads[i];for(let o of s.pendingSlices)r.add(o)}e.pendingSlices=[...r],this.queuedReads.length=0}supplyWorkerData(e,r){p(!e.aborted);let i=e.currentPos,s=i+r.length;this.insertIntoCache({start:i,end:s,bytes:r,view:L(r),age:this.nextAge++}),e.currentPos+=r.length,e.currentPos>e.targetPos&&(e.targetPos=e.currentPos,this.checkQueuedReadsAgainstWorker(e));for(let o=0;o<e.pendingSlices.length;o++){let n=e.pendingSlices[o],a=Math.max(i,n.start),c=Math.min(s,n.start+n.bytes.length);a<c&&n.bytes.set(r.subarray(a-i,c-i),a-n.start);for(let l=0;l<n.holes.length;l++){let u=n.holes[l];i<=u.start&&s>u.start&&(u.start=s),u.end<=u.start&&(n.holes.splice(l,1),l--)}n.holes.length===0&&(n.resolve(n.bytes),e.pendingSlices.splice(o,1),o--)}for(let o=0;o<this.workers.length;o++){let n=this.workers[o];e===n||n.running||Pr(i,s,n.currentPos,n.targetPos)&&(this.workers.splice(o,1),o--)}}supplyFileSize(e){p(this.fileSize===null),this.fileSize=e;for(let r of this.workers){r.targetPos=Math.min(r.targetPos,e),r.strictTarget=!0;for(let i=0;i<r.pendingSlices.length;i++){let s=r.pendingSlices[i];for(let o of s.holes)if(o.end>e){s.resolve(null),r.pendingSlices.splice(i,1),i--;break}}}for(let r=0;r<this.queuedReads.length;r++){let i=this.queuedReads[r];if(i.hole.start>=e){for(let s of i.pendingSlices)s.resolve(null);this.queuedReads.splice(r,1),r--}else if(i.hole.end>e){i.hole.end=e,i.strictTarget=!0;for(let s=0;s<i.pendingSlices.length;s++){let o=i.pendingSlices[s];o.start>=e&&(o.resolve(null),i.pendingSlices.splice(s,1),s--)}}}}signalWorkerStoppedRunning(e){e.running=!1,e.pendingSlices.length=0}onWorkerFinished(e){let r=this.workers.indexOf(e);p(r!==-1),e.running=!1,this.workers.splice(r,1),this.fileSize===null&&this.supplyFileSize(e.currentPos);for(let i of e.pendingSlices)i.resolve(null)}insertIntoCache(e){if(this.options.maxCacheSize===0)return;let r=Q(this.cache,e.start,i=>i.start)+1;if(r>0){let i=this.cache[r-1];if(i.end>=e.end)return;if(i.end>e.start){let s=new Uint8Array(e.end-i.start);s.set(i.bytes,0),s.set(e.bytes,e.start-i.start),this.currentCacheSize+=e.end-i.end,i.bytes=s,i.view=L(s),i.end=e.end,r--,e=i}else this.cache.splice(r,0,e),this.currentCacheSize+=e.bytes.length}else this.cache.splice(r,0,e),this.currentCacheSize+=e.bytes.length;for(let i=r+1;i<this.cache.length;i++){let s=this.cache[i];if(e.end<=s.start)break;if(e.end>=s.end){this.cache.splice(i,1),this.currentCacheSize-=s.bytes.length,i--;continue}let o=new Uint8Array(s.end-e.start);o.set(e.bytes,0),o.set(s.bytes,s.start-e.start),this.currentCacheSize-=e.end-s.start,e.bytes=o,e.view=L(o),e.end=s.end,this.cache.splice(i,1);break}for(;this.currentCacheSize>this.options.maxCacheSize;){let i=0,s=this.cache[0];for(let o=1;o<this.cache.length;o++){let n=this.cache[o];n.age<s.age&&(i=o,s=n)}if(this.currentCacheSize-s.bytes.length<=this.options.maxCacheSize)break;this.cache.splice(i,1),this.currentCacheSize-=s.bytes.length}}dispose(){for(let e of this.workers)e.aborted=!0;this.workers.length=0,this.cache.length=0,this.disposed=!0}};var $r=class extends Te{constructor(e,r,i){if(super(),this._ref=null,e._disposed)throw new Error("Cannot create a slice of a disposed source.");this._baseSource=e,this._offset=r,this._length=i??null}_getFileSize(){let e=this._baseSource._getFileSize();return e===void 0?this._length!==null?this._length:void 0:e===null?this._length!==null?this._length:null:K(e-this._offset,0,this._length??1/0)}_read(e,r,i,s){if(this._length!==null&&r>this._length)return null;let o=this._baseSource._read(this._offset+e,this._offset+r,this._offset+i,this._offset+s),n=a=>a?(a.offset-=this._offset,a):null;return o instanceof Promise?o.then(n):n(o)}_dispose(){this._ref?.free()}ref(){return this._ref??=this._baseSource.ref(),super.ref()}};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var Ht=class{constructor(){this._isIsobmff=!1}},Xr=class extends Ht{constructor(){super(...arguments),this._isIsobmff=!0}async _getMajorBrand(e){let r=e._reader.requestSlice(0,12);if(r instanceof Promise&&(r=await r),!r)return null;r.skip(4);let i=ge(r,4);return i!=="ftyp"&&i!=="styp"?null:ge(r,4)}_createDemuxer(e){return new jr(e)}},Yr=class extends Xr{async _canReadInput(e){let r=await this._getMajorBrand(e);if(r!==null)return r!=="qt  ";let i=e._reader.requestSlice(4,4);if(i instanceof Promise&&(i=await i),!i)return!1;let s=ge(i,4);return s==="moof"||s==="sidx"}get name(){return"MP4"}get mimeType(){return"video/mp4"}};var Xi=new Yr;var Gs=(t,e)=>{if(!t||typeof t!="object")throw new TypeError(`${e}, when provided, must be an object.`);if(t.isobmff!==void 0){if(!t.isobmff||typeof t.isobmff!="object")throw new TypeError(`${e}.isobmff, when provided, must be an object.`);if(t.isobmff.resolveKeyId!==void 0&&typeof t.isobmff.resolveKeyId!="function")throw new TypeError(`${e}.isobmff.resolveKeyId, when provided, must be a function.`)}if(t.hls!==void 0){if(!t.hls||typeof t.hls!="object")throw new TypeError(`${e}.hls, when provided, must be an object.`);if(t.hls.offsetTimestampsByDateTime!==void 0&&typeof t.hls.offsetTimestampsByDateTime!="boolean")throw new TypeError(`${e}.hls.offsetTimestampsByDateTime, when provided, must be a boolean.`)}};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var ha=function(t,e,r){if(e!=null){if(typeof e!="object"&&typeof e!="function")throw new TypeError("Object expected.");var i,s;if(r){if(!Symbol.asyncDispose)throw new TypeError("Symbol.asyncDispose is not defined.");i=e[Symbol.asyncDispose]}if(i===void 0){if(!Symbol.dispose)throw new TypeError("Symbol.dispose is not defined.");i=e[Symbol.dispose],r&&(s=i)}if(typeof i!="function")throw new TypeError("Object not disposable.");s&&(i=function(){try{s.call(this)}catch(o){return Promise.reject(o)}}),t.stack.push({value:e,dispose:i,async:r})}else r&&t.stack.push({async:!0});return e},ma=(function(t){return function(e){function r(n){e.error=e.hasError?new t(n,e.error,"An error was suppressed during disposal."):n,e.hasError=!0}var i,s=0;function o(){for(;i=e.stack.pop();)try{if(!i.async&&s===1)return s=0,e.stack.push(i),Promise.resolve().then(o);if(i.dispose){var n=i.dispose.call(i.value);if(i.async)return s|=2,Promise.resolve(n).then(o,function(a){return r(a),o()})}else s|=1}catch(a){r(a)}if(s===1)return e.hasError?Promise.reject(e.error):Promise.resolve();if(e.hasError)throw e.error}return o()}})(typeof SuppressedError=="function"?SuppressedError:function(t,e,r){var i=new Error(r);return i.name="SuppressedError",i.error=t,i.suppressed=e,i});Mt();var $s=-1/0,Xs=-1/0,Ar=null;typeof FinalizationRegistry<"u"&&(Ar=new FinalizationRegistry(t=>{let e=performance.now();t.type==="video"?(e-$s>=1e3&&(M._error("A VideoSample was garbage collected without first being closed. For proper resource management, make sure to call close() on all your VideoSamples as soon as you're done using them."),$s=e),typeof VideoFrame<"u"&&t.data instanceof VideoFrame&&t.data.close()):(e-Xs>=1e3&&(M._error("An AudioSample was garbage collected without first being closed. For proper resource management, make sure to call close() on all your AudioSamples as soon as you're done using them."),Xs=e),typeof AudioData<"u"&&t.data instanceof AudioData&&t.data.close())}));var Xe=class{constructor(){this._referenceCount=0,this._lastAllocationBuffer=null}},Yi=["I420","I420P10","I420P12","I420A","I420AP10","I420AP12","I422","I422P10","I422P12","I422A","I422AP10","I422AP12","I444","I444P10","I444P12","I444A","I444AP10","I444AP12","NV12","RGBA","RGBX","BGRA","BGRX"],pa=new Set(Yi),Ie=class t{get codedWidth(){return this.visibleRect.width}get codedHeight(){return this.visibleRect.height}get displayWidth(){return this.rotation%180===0?this.squarePixelWidth:this.squarePixelHeight}get displayHeight(){return this.rotation%180===0?this.squarePixelHeight:this.squarePixelWidth}get microsecondTimestamp(){return Math.trunc(Fe*this.timestamp)}get microsecondDuration(){return Math.trunc(Fe*this.duration)}get hasAlpha(){return this.format&&this.format.includes("A")}constructor(e,r){if(this._closed=!1,e instanceof ArrayBuffer||typeof SharedArrayBuffer<"u"&&e instanceof SharedArrayBuffer||ArrayBuffer.isView(e)){if(!r||typeof r!="object")throw new TypeError("init must be an object.");if(r.format===void 0||!pa.has(r.format))throw new TypeError("init.format must be one of: "+Yi.join(", "));if(!Number.isInteger(r.codedWidth)||r.codedWidth<=0)throw new TypeError("init.codedWidth must be a positive integer.");if(!Number.isInteger(r.codedHeight)||r.codedHeight<=0)throw new TypeError("init.codedHeight must be a positive integer.");if(r.rotation!==void 0&&![0,90,180,270].includes(r.rotation))throw new TypeError("init.rotation, when provided, must be 0, 90, 180, or 270.");if(!Number.isFinite(r.timestamp))throw new TypeError("init.timestamp must be a number.");if(r.duration!==void 0&&(!Number.isFinite(r.duration)||r.duration<0))throw new TypeError("init.duration, when provided, must be a non-negative number.");if(r.layout!==void 0){if(!Array.isArray(r.layout))throw new TypeError("init.layout, when provided, must be an array.");for(let o of r.layout){if(!o||typeof o!="object"||Array.isArray(o))throw new TypeError("Each entry in init.layout must be an object.");if(!Number.isInteger(o.offset)||o.offset<0)throw new TypeError("plane.offset must be a non-negative integer.");if(!Number.isInteger(o.stride)||o.stride<0)throw new TypeError("plane.stride must be a non-negative integer.")}}if(r.visibleRect!==void 0&&Ri(r.visibleRect,"init.visibleRect"),r.displayWidth!==void 0&&(!Number.isInteger(r.displayWidth)||r.displayWidth<=0))throw new TypeError("init.displayWidth, when provided, must be a positive integer.");if(r.displayHeight!==void 0&&(!Number.isInteger(r.displayHeight)||r.displayHeight<=0))throw new TypeError("init.displayHeight, when provided, must be a positive integer.");if(r.displayWidth!==void 0!=(r.displayHeight!==void 0))throw new TypeError("init.displayWidth and init.displayHeight must be either both provided or both omitted.");this.format=r.format,this.rotation=r.rotation??0,this.timestamp=r.timestamp,this.duration=r.duration??0;let i=r.layout??ya(r.format,r.codedWidth,r.codedHeight),s=r.colorSpace??null;s===null&&(this.format==="RGBA"||this.format==="RGBX"||this.format==="BGRA"||this.format==="BGRX"?s={primaries:"bt709",transfer:"iec61966-2-1",matrix:"rgb",fullRange:!0}:s={primaries:"bt709",transfer:"bt709",matrix:"bt709",fullRange:!1}),this.visibleRect={left:r.visibleRect?.left??0,top:r.visibleRect?.top??0,width:r.visibleRect?.width??r.codedWidth,height:r.visibleRect?.height??r.codedHeight},r.displayWidth!==void 0?(this.squarePixelWidth=this.rotation%180===0?r.displayWidth:r.displayHeight,this.squarePixelHeight=this.rotation%180===0?r.displayHeight:r.displayWidth):(this.squarePixelWidth=this.visibleRect.width,this.squarePixelHeight=this.visibleRect.height),this._data=r._doNotCopy?ie(e):ie(e).slice(),this._layout=i,this.colorSpace=new br(s)}else if(typeof VideoFrame<"u"&&e instanceof VideoFrame){if(r?.rotation!==void 0&&![0,90,180,270].includes(r.rotation))throw new TypeError("init.rotation, when provided, must be 0, 90, 180, or 270.");if(r?.timestamp!==void 0&&!Number.isFinite(r?.timestamp))throw new TypeError("init.timestamp, when provided, must be a number.");if(r?.duration!==void 0&&(!Number.isFinite(r.duration)||r.duration<0))throw new TypeError("init.duration, when provided, must be a non-negative number.");r?.visibleRect!==void 0&&Ri(r.visibleRect,"init.visibleRect"),this._data=e,this._layout=null,this.format=e.format,this.visibleRect={left:e.visibleRect?.x??0,top:e.visibleRect?.y??0,width:e.visibleRect?.width??e.codedWidth,height:e.visibleRect?.height??e.codedHeight},this.rotation=r?.rotation??0,this.squarePixelWidth=e.displayWidth,this.squarePixelHeight=e.displayHeight,this.timestamp=r?.timestamp??e.timestamp/1e6,this.duration=r?.duration??(e.duration??0)/1e6,this.colorSpace=new br(e.colorSpace)}else if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof SVGImageElement<"u"&&e instanceof SVGImageElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap||typeof HTMLVideoElement<"u"&&e instanceof HTMLVideoElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof OffscreenCanvas<"u"&&e instanceof OffscreenCanvas){if(!r||typeof r!="object")throw new TypeError("init must be an object.");if(r.rotation!==void 0&&![0,90,180,270].includes(r.rotation))throw new TypeError("init.rotation, when provided, must be 0, 90, 180, or 270.");if(!Number.isFinite(r.timestamp))throw new TypeError("init.timestamp must be a number.");if(r.duration!==void 0&&(!Number.isFinite(r.duration)||r.duration<0))throw new TypeError("init.duration, when provided, must be a non-negative number.");if(typeof VideoFrame<"u")return new t(new VideoFrame(e,{timestamp:Math.trunc(r.timestamp*Fe),duration:Math.trunc((r.duration??0)*Fe)||void 0}),r);let i=0,s=0;if("naturalWidth"in e?(i=e.naturalWidth,s=e.naturalHeight):"videoWidth"in e?(i=e.videoWidth,s=e.videoHeight):"width"in e&&(i=Number(e.width),s=Number(e.height)),!i||!s)throw new TypeError("Could not determine dimensions.");let o=new OffscreenCanvas(i,s),n=o.getContext("2d",{alpha:or(),willReadFrequently:!0});if(!n)throw new Error("OffscreenCanvas must have support for the '2d' context in order to create a VideoSample from this data.");n.drawImage(e,0,0),this._data=o,this._layout=null,this.format="RGBX",this.visibleRect={left:0,top:0,width:i,height:s},this.squarePixelWidth=i,this.squarePixelHeight=s,this.rotation=r.rotation??0,this.timestamp=r.timestamp,this.duration=r.duration??0,this.colorSpace=new br({matrix:"rgb",primaries:"bt709",transfer:"iec61966-2-1",fullRange:!0})}else if(e instanceof Xe){if(!r||typeof r!="object")throw new TypeError("init must be an object.");if(r.rotation!==void 0&&![0,90,180,270].includes(r.rotation))throw new TypeError("init.rotation, when provided, must be 0, 90, 180, or 270.");if(!Number.isFinite(r.timestamp))throw new TypeError("init.timestamp must be a number.");if(r.duration!==void 0&&(!Number.isFinite(r.duration)||r.duration<0))throw new TypeError("init.duration, when provided, must be a non-negative number.");if(this._data=e,e._referenceCount++,this.format=e.getFormat(),this.format!==null&&!Yi.includes(this.format))throw new TypeError("getFormat() must return a VideoSamplePixelFormat or null.");if(this.visibleRect={left:0,top:0,width:e.getCodedWidth(),height:e.getCodedHeight()},!Number.isInteger(this.visibleRect.width)||this.visibleRect.width<=0)throw new TypeError("getCodedWidth() must return a positive integer.");if(!Number.isInteger(this.visibleRect.height)||this.visibleRect.height<=0)throw new TypeError("getCodedHeight() must return a positive integer.");if(this.squarePixelWidth=e.getSquarePixelWidth(),!Number.isInteger(this.squarePixelWidth)||this.squarePixelWidth<=0)throw new TypeError("getSquarePixelWidth() must return a positive integer.");if(this.squarePixelHeight=e.getSquarePixelHeight(),!Number.isInteger(this.squarePixelHeight)||this.squarePixelHeight<=0)throw new TypeError("getSquarePixelHeight() must return a positive integer.");this.rotation=r.rotation??0,this.timestamp=r.timestamp,this.duration=r.duration??0,this.colorSpace=e.getColorSpace()}else throw new TypeError("Invalid data type: Must be a BufferSource, CanvasImageSource, or VideoSampleResource.");this.encodeOptions=r?.encodeOptions??{},this.pixelAspectRatio=gt({num:this.squarePixelWidth*this.codedHeight,den:this.squarePixelHeight*this.codedWidth}),Ar?.register(this,{type:"video",data:this._data},this)}clone(){if(this._closed)throw new Error("VideoSample is closed.");return p(this._data!==null),this._data instanceof Xe?new t(this._data,{timestamp:this.timestamp,duration:this.duration,rotation:this.rotation,encodeOptions:this.encodeOptions}):wr(this._data)?new t(this._data.clone(),{timestamp:this.timestamp,duration:this.duration,rotation:this.rotation,encodeOptions:this.encodeOptions}):this._data instanceof Uint8Array?(p(this._layout),new t(this._data,{format:this.format,layout:this._layout,codedWidth:this.codedWidth,codedHeight:this.codedHeight,timestamp:this.timestamp,duration:this.duration,colorSpace:this.colorSpace,rotation:this.rotation,visibleRect:this.visibleRect,displayWidth:this.displayWidth,displayHeight:this.displayHeight,encodeOptions:this.encodeOptions,_doNotCopy:!0})):new t(this._data,{format:this.format,codedWidth:this.codedWidth,codedHeight:this.codedHeight,timestamp:this.timestamp,duration:this.duration,colorSpace:this.colorSpace,rotation:this.rotation,visibleRect:this.visibleRect,displayWidth:this.displayWidth,displayHeight:this.displayHeight,encodeOptions:this.encodeOptions})}close(){this._closed||(Ar?.unregister(this),this._data instanceof Xe?(this._data._referenceCount--,this._data._referenceCount===0&&this._data.close()):wr(this._data)?this._data.close():this._data=null,this._closed=!0)}allocationSize(e={}){if(Zs(e),this._closed)throw new Error("VideoSample is closed.");if((e.format??this.format)==null)throw new Error("Cannot get allocation size when format is null.");return wr(this._data)?this._data.allocationSize(e):Js(this,e).allocationSize}async copyTo(e,r={}){if(!Ft(e))throw new TypeError("destination must be an ArrayBuffer or an ArrayBuffer view.");if(Zs(r),this._closed)throw new Error("VideoSample is closed.");if((r.format??this.format)==null)throw new Error("Cannot copy video sample data when format is null.");if(p(this._data!==null),wr(this._data))return this._data.copyTo(e,r);if(r.format&&!["RGBA","RGBX","BGRA","BGRX"].includes(this.format)&&["RGBA","RGBX","BGRA","BGRX"].includes(r.format))if(this._data instanceof Xe){let l={stack:[],error:void 0,hasError:!1};try{let u=ha(l,await this._data.toRgbSample({timestamp:this.timestamp,duration:this.duration,rotation:this.rotation},r.colorSpace??"srgb"),!1);if(!(u instanceof t))throw new TypeError("toRgbSample() must return a VideoSample.");if(!["RGBA","RGBX","BGRA","BGRX"].includes(u.format))throw new Error(`Sample returned by toRgbSample was expected to have an RGB format, got '${u.format}' instead.`);return await u.copyTo(e,r)}catch(u){l.error=u,l.hasError=!0}finally{ma(l)}}else{if(typeof VideoFrame>"u")throw new Error("For this sample, converting from a non-RGB to an RGB format requires VideoFrame to be defined.");let l=this.toVideoFrame(),u=await l.copyTo(e,r);return l.close(),u}let i=Js(this,r);p(this.format);let s=ie(e);if(s.byteLength<i.allocationSize)throw new TypeError(`Destination buffer too small. Required: ${i.allocationSize}, Available: ${s.byteLength}`);let o=Jr(this.format),n;if(this._data instanceof Xe){let l=this._data.getDataPlanes();if(l instanceof Promise&&(l=await l),!Array.isArray(l)||l.some(u=>!(u.data instanceof Uint8Array)||!Number.isInteger(u.stride)||u.stride<0))throw new TypeError('getDataPlanes() must return an array of objects with a Uint8Array "data" property and a non-negative integer "stride" property.');n=l}else if(this._data instanceof Uint8Array)p(this._layout),p(this._layout.length===o.length),n=this._layout.map((l,u)=>{let d=Math.ceil(this.codedHeight/o[u].heightDivisor);return{data:this._data.subarray(l.offset,l.offset+l.stride*d),stride:l.stride}});else{let u=this._data.getContext("2d");p(u);let d=u.getImageData(0,0,this.codedWidth,this.codedHeight);n=[{data:ie(d.data),stride:4*this.codedWidth}]}let a=[],c=o.length;for(let l=0;l<c;l++){let u=i.computedLayouts[l],d=n[l].stride,f=n[l].data,h=u.sourceTop*d;h+=u.sourceLeftBytes;let m=u.destinationOffset,g=u.sourceWidthBytes,w={offset:m,stride:u.destinationStride};for(let y=0;y<u.sourceHeight;y++){if(h+g>f.byteLength)throw new Error("Source buffer OOB read.");if(m+g>s.byteLength)throw new Error("Destination buffer OOB write.");let b=f.subarray(h,h+g);s.set(b,m),h+=d,m+=u.destinationStride}a.push(w)}if(r.format!==void 0){let l=this.format.startsWith("RGB")!==r.format.startsWith("RGB"),u=this.format.includes("X")&&r.format.includes("A");if(l||u)for(let d=0;d<i.allocationSize;d+=4){if(l){let f=s[d],h=s[d+2];s[d]=h,s[d+2]=f}u&&(s[d+3]=255)}}return a}toVideoFrame(){if(this._closed)throw new Error("VideoSample is closed.");if(p(this._data!==null),this._data instanceof Xe){if(this.format===null)throw new Error("Cannot convert a VideoSampleResource-backed VideoSample to VideoFrame if format is null.");let e=this._data.getDataPlanes();if(e instanceof Promise)throw new Error("Cannot convert a VideoSampleResource-backed VideoSample to VideoFrame if getDataPlanes() returns a promise.");let r=e.reduce((n,a)=>n+a.data.byteLength,0),i=new Uint8Array(r),s=0,o=[];for(let n of e)i.set(n.data,s),o.push(s),s+=n.data.byteLength;return new VideoFrame(i,{format:this.format,layout:e.map((n,a)=>({offset:o[a],stride:n.stride})),codedWidth:this.codedWidth,codedHeight:this.codedHeight,timestamp:this.microsecondTimestamp,duration:this.microsecondDuration,colorSpace:this.colorSpace,visibleRect:this.visibleRect,displayWidth:this.squarePixelWidth,displayHeight:this.squarePixelHeight})}else return wr(this._data)?new VideoFrame(this._data,{timestamp:this.microsecondTimestamp,duration:this.microsecondDuration||void 0}):this._data instanceof Uint8Array?(p(this._layout),new VideoFrame(this._data,{format:this.format,codedWidth:this.codedWidth,codedHeight:this.codedHeight,layout:this._layout,timestamp:this.microsecondTimestamp,duration:this.microsecondDuration||void 0,colorSpace:this.colorSpace,visibleRect:this.visibleRect,displayWidth:this.squarePixelWidth,displayHeight:this.squarePixelHeight})):new VideoFrame(this._data,{timestamp:this.microsecondTimestamp,duration:this.microsecondDuration||void 0})}draw(e,r,i,s,o,n,a,c,l){let u=0,d=0,f=this.displayWidth,h=this.displayHeight,m=0,g=0,w=this.displayWidth,y=this.displayHeight;if(n!==void 0?(u=r,d=i,f=s,h=o,m=n,g=a,c!==void 0?(w=c,y=l):(w=f,y=h)):(m=r,g=i,s!==void 0&&(w=s,y=o)),!(typeof CanvasRenderingContext2D<"u"&&e instanceof CanvasRenderingContext2D||typeof OffscreenCanvasRenderingContext2D<"u"&&e instanceof OffscreenCanvasRenderingContext2D))throw new TypeError("context must be a CanvasRenderingContext2D or OffscreenCanvasRenderingContext2D.");if(!Number.isFinite(u))throw new TypeError("sx must be a number.");if(!Number.isFinite(d))throw new TypeError("sy must be a number.");if(!Number.isFinite(f)||f<0)throw new TypeError("sWidth must be a non-negative number.");if(!Number.isFinite(h)||h<0)throw new TypeError("sHeight must be a non-negative number.");if(!Number.isFinite(m))throw new TypeError("dx must be a number.");if(!Number.isFinite(g))throw new TypeError("dy must be a number.");if(!Number.isFinite(w)||w<0)throw new TypeError("dWidth must be a non-negative number.");if(!Number.isFinite(y)||y<0)throw new TypeError("dHeight must be a non-negative number.");if(this._closed)throw new Error("VideoSample is closed.");({sx:u,sy:d,sWidth:f,sHeight:h}=this._rotateSourceRegion(u,d,f,h,this.rotation));let b=this.toCanvasImageSource();e.save();let A=m+w/2,S=g+y/2;e.translate(A,S),e.rotate(this.rotation*Math.PI/180);let T=this.rotation%180===0?1:w/y;e.scale(1/T,T),e.drawImage(b,u,d,f,h,-w/2,-y/2,w,y),e.restore()}drawWithFit(e,r){if(!(typeof CanvasRenderingContext2D<"u"&&e instanceof CanvasRenderingContext2D||typeof OffscreenCanvasRenderingContext2D<"u"&&e instanceof OffscreenCanvasRenderingContext2D))throw new TypeError("context must be a CanvasRenderingContext2D or OffscreenCanvasRenderingContext2D.");if(!r||typeof r!="object")throw new TypeError("options must be an object.");if(!["fill","contain","cover"].includes(r.fit))throw new TypeError("options.fit must be 'fill', 'contain', or 'cover'.");if(r.rotation!==void 0&&![0,90,180,270].includes(r.rotation))throw new TypeError("options.rotation, when provided, must be 0, 90, 180, or 270.");r.crop!==void 0&&xt(r.crop,"options.");let i=e.canvas.width,s=e.canvas.height,o=r.rotation??this.rotation,[n,a]=o%180===0?[this.squarePixelWidth,this.squarePixelHeight]:[this.squarePixelHeight,this.squarePixelWidth],c=r.crop;c&&(c=Tr(c,n,a));let l,u,d,f,{sx:h,sy:m,sWidth:g,sHeight:w}=this._rotateSourceRegion(r.crop?.left??0,r.crop?.top??0,r.crop?.width??n,r.crop?.height??a,o);if(r.fit==="fill")l=0,u=0,d=i,f=s;else{let[b,A]=r.crop?[r.crop.width,r.crop.height]:[n,a],S=r.fit==="contain"?Math.min(i/b,s/A):Math.max(i/b,s/A);d=b*S,f=A*S,l=(i-d)/2,u=(s-f)/2}e.save();let y=o%180===0?1:d/f;e.translate(i/2,s/2),e.rotate(o*Math.PI/180),e.scale(1/y,y),e.translate(-i/2,-s/2),e.drawImage(this.toCanvasImageSource(),h,m,g,w,l,u,d,f),e.restore()}_rotateSourceRegion(e,r,i,s,o){return o===90?[e,r,i,s]=[r,this.squarePixelHeight-e-i,s,i]:o===180?[e,r]=[this.squarePixelWidth-e-i,this.squarePixelHeight-r-s]:o===270&&([e,r,i,s]=[this.squarePixelWidth-r-s,e,s,i]),{sx:e,sy:r,sWidth:i,sHeight:s}}toCanvasImageSource(){if(this._closed)throw new Error("VideoSample is closed.");if(p(this._data!==null),this._data instanceof Xe||this._data instanceof Uint8Array){let e=this.toVideoFrame();return queueMicrotask(()=>e.close()),e}else return this._data}async transform(e){if(!e||typeof e!="object")throw new TypeError("options must be an object.");if(e.width!==void 0&&(!Number.isInteger(e.width)||e.width<=0))throw new TypeError("options.width, when provided, must be a positive integer.");if(e.height!==void 0&&(!Number.isInteger(e.height)||e.height<=0))throw new TypeError("options.height, when provided, must be a positive integer.");if(e.roundDimensionsTo!==void 0&&(!Number.isInteger(e.roundDimensionsTo)||e.roundDimensionsTo<=0))throw new TypeError("options.roundDimensionsTo, when provided, must be a positive integer.");if(e.fit!==void 0&&!["fill","contain","cover"].includes(e.fit))throw new TypeError('options.fit, when provided, must be one of "fill", "contain", or "cover".');if(e.width!==void 0&&e.height!==void 0&&e.fit===void 0)throw new TypeError("When both options.width and options.height are provided, options.fit must also be provided.");if(e.rotate!==void 0&&![0,90,180,270].includes(e.rotate))throw new TypeError("options.rotate, when provided, must be 0, 90, 180 or 270.");if(e.crop!==void 0&&xt(e.crop,"options."),e.alpha!==void 0&&!["keep","discard"].includes(e.alpha))throw new TypeError("options.alpha, when provided, must be 'keep' or 'discard'.");let r=ht(this.rotation+(e.rotate??0)),[i,s]=r%180===0?[this.squarePixelWidth,this.squarePixelHeight]:[this.squarePixelHeight,this.squarePixelWidth],o=e.crop;o&&(o=Tr(o,i,s));let n=o?o.width:i,a=o?o.height:s,c=n/a,l,u;e.width!==void 0&&e.height===void 0?(l=e.width,u=l/c):e.width===void 0&&e.height!==void 0?(u=e.height,l=u*c):e.width!==void 0&&e.height!==void 0?(l=e.width,u=e.height):(l=n,u=a),l=nr(l,e.roundDimensionsTo??1),u=nr(u,e.roundDimensionsTo??1);let d={width:l,height:u,fit:e.fit??"fill",rotation:r,crop:o??{left:0,top:0,width:i,height:s},alpha:e.alpha??"keep"};for(let g of ga){let w=g(this,d);if(w instanceof Promise&&(w=await w),w!==null)return w}let f=null,h=!1;for(let g of gr)if(g.canvas.width===d.width&&g.canvas.height===d.height){f=g.canvas,g.age=Ys++;break}if(f===null){if(typeof OffscreenCanvas<"u")f=new OffscreenCanvas(d.width,d.height);else{if(typeof window>"u"||typeof document>"u")throw new Error("Cannot transform VideoSamples in this environment. Either run in an environment with OffscreenCanvas or HTMLCanvasElement, or supply a custom VideoSample transformer using registerVideoSampleTransformer().");f=document.createElement("canvas"),f.width=d.width,f.height=d.height}h=!0,gr.length>=wa&&gr.splice(Fr(gr,g=>g.age),1),gr.push({canvas:f,age:Ys++})}let m=f.getContext("2d",{alpha:!0});if(!m)throw new Error("The '2d' canvas context is required to transform VideoSamples. Register a custom transformer using registerVideoSampleTransformer to work around this limitation.");return d.alpha==="discard"?(m.fillStyle="black",m.fillRect(0,0,d.width,d.height)):h||m.clearRect(0,0,d.width,d.height),this.drawWithFit(m,{fit:d.fit,rotation:d.rotation,crop:d.crop}),new t(f,{timestamp:this.timestamp,duration:this.duration,rotation:0})}setRotation(e){if(![0,90,180,270].includes(e))throw new TypeError("newRotation must be 0, 90, 180, or 270.");this.rotation=e}setTimestamp(e){if(!Number.isFinite(e))throw new TypeError("newTimestamp must be a number.");this.timestamp=e}setDuration(e){if(!Number.isFinite(e)||e<0)throw new TypeError("newDuration must be a non-negative number.");this.duration=e}setEncodeOptions(e){if(!e||typeof e!="object")throw new TypeError("newEncodeOptions must be an object.");this.encodeOptions=e}[Symbol.dispose](){this.close()}},ga=[];var wa=3,gr=[],Ys=0,br=class{constructor(e){if(e!==void 0){if(!e||typeof e!="object")throw new TypeError("init.colorSpace, when provided, must be an object.");let r=Object.keys(We);if(e.primaries!=null&&!r.includes(e.primaries))throw new TypeError(`init.colorSpace.primaries, when provided, must be one of ${r.join(", ")}.`);let i=Object.keys(Ne);if(e.transfer!=null&&!i.includes(e.transfer))throw new TypeError(`init.colorSpace.transfer, when provided, must be one of ${i.join(", ")}.`);let s=Object.keys(He);if(e.matrix!=null&&!s.includes(e.matrix))throw new TypeError(`init.colorSpace.matrix, when provided, must be one of ${s.join(", ")}.`);if(e.fullRange!=null&&typeof e.fullRange!="boolean")throw new TypeError("init.colorSpace.fullRange, when provided, must be a boolean.")}this.primaries=e?.primaries??null,this.transfer=e?.transfer??null,this.matrix=e?.matrix??null,this.fullRange=e?.fullRange??null}toJSON(){return{primaries:this.primaries,transfer:this.transfer,matrix:this.matrix,fullRange:this.fullRange}}},wr=t=>typeof VideoFrame<"u"&&t instanceof VideoFrame,Tr=(t,e,r)=>{let i=Math.min(t.left,e),s=Math.min(t.top,r),o=Math.min(t.width,e-i),n=Math.min(t.height,r-s);return p(o>=0),p(n>=0),{left:i,top:s,width:o,height:n}},xt=(t,e)=>{if(!t||typeof t!="object")throw new TypeError(e+"crop, when provided, must be an object.");if(!Number.isInteger(t.left)||t.left<0)throw new TypeError(e+"crop.left must be a non-negative integer.");if(!Number.isInteger(t.top)||t.top<0)throw new TypeError(e+"crop.top must be a non-negative integer.");if(!Number.isInteger(t.width)||t.width<0)throw new TypeError(e+"crop.width must be a non-negative integer.");if(!Number.isInteger(t.height)||t.height<0)throw new TypeError(e+"crop.height must be a non-negative integer.")},Zs=t=>{if(!t||typeof t!="object")throw new TypeError("options must be an object.");if(t.colorSpace!==void 0&&!["display-p3","srgb"].includes(t.colorSpace))throw new TypeError("options.colorSpace, when provided, must be 'display-p3' or 'srgb'.");if(t.format!==void 0&&typeof t.format!="string")throw new TypeError("options.format, when provided, must be a string.");if(t.layout!==void 0){if(!Array.isArray(t.layout))throw new TypeError("options.layout, when provided, must be an array.");for(let e of t.layout){if(!e||typeof e!="object")throw new TypeError("Each entry in options.layout must be an object.");if(!Number.isInteger(e.offset)||e.offset<0)throw new TypeError("plane.offset must be a non-negative integer.");if(!Number.isInteger(e.stride)||e.stride<0)throw new TypeError("plane.stride must be a non-negative integer.")}}if(t.rect!==void 0){if(!t.rect||typeof t.rect!="object")throw new TypeError("options.rect, when provided, must be an object.");if(t.rect.x!==void 0&&(!Number.isInteger(t.rect.x)||t.rect.x<0))throw new TypeError("options.rect.x, when provided, must be a non-negative integer.");if(t.rect.y!==void 0&&(!Number.isInteger(t.rect.y)||t.rect.y<0))throw new TypeError("options.rect.y, when provided, must be a non-negative integer.");if(t.rect.width!==void 0&&(!Number.isInteger(t.rect.width)||t.rect.width<0))throw new TypeError("options.rect.width, when provided, must be a non-negative integer.");if(t.rect.height!==void 0&&(!Number.isInteger(t.rect.height)||t.rect.height<0))throw new TypeError("options.rect.height, when provided, must be a non-negative integer.")}},ya=(t,e,r)=>{let i=Jr(t),s=[],o=0;for(let n of i){let a=Math.ceil(e/n.widthDivisor),c=Math.ceil(r/n.heightDivisor),l=a*n.sampleBytes,u=l*c;s.push({offset:o,stride:l}),o+=u}return s},Jr=t=>{let e=(r,i,s,o,n)=>{let a=[{sampleBytes:r,widthDivisor:1,heightDivisor:1},{sampleBytes:i,widthDivisor:s,heightDivisor:o},{sampleBytes:i,widthDivisor:s,heightDivisor:o}];return n&&a.push({sampleBytes:r,widthDivisor:1,heightDivisor:1}),a};switch(t){case"I420":return e(1,1,2,2,!1);case"I420P10":case"I420P12":return e(2,2,2,2,!1);case"I420A":return e(1,1,2,2,!0);case"I420AP10":case"I420AP12":return e(2,2,2,2,!0);case"I422":return e(1,1,2,1,!1);case"I422P10":case"I422P12":return e(2,2,2,1,!1);case"I422A":return e(1,1,2,1,!0);case"I422AP10":case"I422AP12":return e(2,2,2,1,!0);case"I444":return e(1,1,1,1,!1);case"I444P10":case"I444P12":return e(2,2,1,1,!1);case"I444A":return e(1,1,1,1,!0);case"I444AP10":case"I444AP12":return e(2,2,1,1,!0);case"NV12":return[{sampleBytes:1,widthDivisor:1,heightDivisor:1},{sampleBytes:2,widthDivisor:2,heightDivisor:2}];case"RGBA":case"RGBX":case"BGRA":case"BGRX":return[{sampleBytes:4,widthDivisor:1,heightDivisor:1}];default:ae(t),p(!1)}},Js=(t,e)=>{let r={left:0,top:0,width:t.codedWidth,height:t.codedHeight},i=e.rect,s=ba(r,i,t.codedWidth,t.codedHeight,t.format),o=e.layout,n;if(!e.format||e.format===t.format)n=t.format;else if(["RGBA","RGBX","BGRA","BGRX"].includes(e.format))n=e.format;else throw new Error("NotSupportedError: Invalid destination format.");return Ta(s,n,o)},ba=(t,e,r,i,s)=>{let o={...t};if(e!==void 0){if(e.width===0||e.height===0)throw new TypeError("visibleRect dimensions cannot be zero.");if((e.x||0)+(e.width||0)>r)throw new TypeError("visibleRect exceeds codedWidth.");if((e.y||0)+(e.height||0)>i)throw new TypeError("visibleRect exceeds codedHeight.");o.x=e.x||0,o.y=e.y||0,o.width=e.width||0,o.height=e.height||0}if(!Aa(s,o))throw new TypeError("visibleRect alignment is invalid for the format.");return o},Aa=(t,e)=>{if(t===null)return!0;let r=Jr(t);for(let i=0;i<r.length;i++){let s=r[i],o=s.widthDivisor,n=s.heightDivisor;if((e.x||0)%o!==0||(e.y||0)%n!==0)return!1}return!0},Ta=(t,e,r)=>{let i=Jr(e),s=i.length;if(r!==void 0&&r.length!==s)throw new TypeError(`Layout must have ${s} planes.`);let o=0,n=[],a=[];for(let c=0;c<s;c++){let l=i[c],u=l.sampleBytes,d=l.widthDivisor,f=l.heightDivisor,h={destinationOffset:0,destinationStride:0,sourceTop:0,sourceHeight:0,sourceLeftBytes:0,sourceWidthBytes:0};if(h.sourceTop=Math.ceil(Math.trunc(t.y||0)/f),h.sourceHeight=Math.ceil(Math.trunc(t.height||0)/f),h.sourceLeftBytes=Math.floor(Math.trunc(t.x||0)/d)*u,h.sourceWidthBytes=Math.floor(Math.trunc(t.width||0)/d)*u,r!==void 0){let w=r[c];if(w.stride<h.sourceWidthBytes)throw new TypeError(`Stride for plane ${c} is too small.`);h.destinationOffset=w.offset,h.destinationStride=w.stride}else h.destinationOffset=o,h.destinationStride=h.sourceWidthBytes;let g=h.destinationStride*h.sourceHeight+h.destinationOffset;if(g>4294967295)throw new TypeError("Allocation size exceeds limit.");a.push(g),o=Math.max(o,g);for(let w=0;w<c;w++){let y=n[w];if(!(a[c]<=y.destinationOffset||a[w]<=h.destinationOffset))throw new TypeError("Planes overlap.")}n.push(h)}return{allocationSize:o,computedLayouts:n}},Zr=new Set(["f32","f32-planar","s16","s16-planar","s32","s32-planar","u8","u8-planar"]),At=class{constructor(){this._referenceCount=0}},fe=class t{get microsecondTimestamp(){return Math.trunc(Fe*this.timestamp)}get microsecondDuration(){return Math.trunc(Fe*this.duration)}constructor(e){if(this._closed=!1,yr(e)){if(e.format===null)throw new TypeError("AudioData with null format is not supported.");this._data=e,this.format=e.format,this.sampleRate=e.sampleRate,this.numberOfFrames=e.numberOfFrames,this.numberOfChannels=e.numberOfChannels,this.timestamp=e.timestamp/1e6,this.duration=e.numberOfFrames/e.sampleRate}else if(e instanceof At){if(this._data=e,e._referenceCount++,this.format=e.getFormat(),!Zr.has(this.format))throw new TypeError("getFormat() must return an AudioSampleFormat.");if(this.sampleRate=e.getSampleRate(),!Number.isInteger(this.sampleRate)||this.sampleRate<=0)throw new TypeError("getSampleRate() must return a positive integer.");if(this.numberOfFrames=e.getNumberOfFrames(),!Number.isInteger(this.numberOfFrames)||this.numberOfFrames<0)throw new TypeError("getNumberOfFrames() must return a non-negative integer.");if(this.numberOfChannels=e.getNumberOfChannels(),!Number.isInteger(this.numberOfChannels)||this.numberOfChannels<=0)throw new TypeError("getNumberOfChannels() must return a positive integer.");if(this.timestamp=e.getTimestamp(),!Number.isFinite(this.timestamp))throw new TypeError("getTimestamp() must return a finite number.");this.duration=this.numberOfFrames/this.sampleRate}else{if(!e||typeof e!="object")throw new TypeError("Invalid AudioDataInit: must be an object.");if(!Zr.has(e.format))throw new TypeError("Invalid AudioDataInit: invalid format.");if(!Number.isFinite(e.sampleRate)||e.sampleRate<=0)throw new TypeError("Invalid AudioDataInit: sampleRate must be > 0.");if(!Number.isInteger(e.numberOfChannels)||e.numberOfChannels===0)throw new TypeError("Invalid AudioDataInit: numberOfChannels must be an integer > 0.");if(!Number.isFinite(e?.timestamp))throw new TypeError("init.timestamp must be a number.");let r=e.data.byteLength/(ze(e.format)*e.numberOfChannels);if(!Number.isInteger(r))throw new TypeError("Invalid AudioDataInit: data size is not a multiple of frame size.");this.format=e.format,this.sampleRate=e.sampleRate,this.numberOfFrames=r,this.numberOfChannels=e.numberOfChannels,this.timestamp=e.timestamp,this.duration=r/e.sampleRate;let i;if(e.data instanceof ArrayBuffer)i=new Uint8Array(e.data);else if(ArrayBuffer.isView(e.data))i=new Uint8Array(e.data.buffer,e.data.byteOffset,e.data.byteLength);else throw new TypeError("Invalid AudioDataInit: data is not a BufferSource.");let s=this.numberOfFrames*this.numberOfChannels*ze(this.format);if(i.byteLength<s)throw new TypeError("Invalid AudioDataInit: insufficient data size.");this._data=i}Ar?.register(this,{type:"audio",data:this._data},this)}allocationSize(e){if(!e||typeof e!="object")throw new TypeError("options must be an object.");if(!Number.isInteger(e.planeIndex)||e.planeIndex<0)throw new TypeError("planeIndex must be a non-negative integer.");if(e.format!==void 0&&!Zr.has(e.format))throw new TypeError("Invalid format.");if(e.frameOffset!==void 0&&(!Number.isInteger(e.frameOffset)||e.frameOffset<0))throw new TypeError("frameOffset must be a non-negative integer.");if(e.frameCount!==void 0&&(!Number.isInteger(e.frameCount)||e.frameCount<0))throw new TypeError("frameCount must be a non-negative integer.");if(this._closed)throw new Error("AudioSample is closed.");let r=e.format??this.format,i=e.frameOffset??0;if(i>=this.numberOfFrames)throw new RangeError("frameOffset out of range");let s=e.frameCount!==void 0?e.frameCount:this.numberOfFrames-i;if(s>this.numberOfFrames-i)throw new RangeError("frameCount out of range");let o=ze(r),n=Tt(r);if(n&&e.planeIndex>=this.numberOfChannels)throw new RangeError("planeIndex out of range");if(!n&&e.planeIndex!==0)throw new RangeError("planeIndex out of range");return(n?s:s*this.numberOfChannels)*o}copyTo(e,r){if(!Ft(e))throw new TypeError("destination must be an ArrayBuffer or an ArrayBuffer view.");if(!r||typeof r!="object")throw new TypeError("options must be an object.");if(!Number.isInteger(r.planeIndex)||r.planeIndex<0)throw new TypeError("planeIndex must be a non-negative integer.");if(r.format!==void 0&&!Zr.has(r.format))throw new TypeError("Invalid format.");if(r.frameOffset!==void 0&&(!Number.isInteger(r.frameOffset)||r.frameOffset<0))throw new TypeError("frameOffset must be a non-negative integer.");if(r.frameCount!==void 0&&(!Number.isInteger(r.frameCount)||r.frameCount<0))throw new TypeError("frameCount must be a non-negative integer.");if(this._closed)throw new Error("AudioSample is closed.");let{format:i,frameCount:s,frameOffset:o}=r,{planeIndex:n}=r,a=this.format,c=i??this.format;if(!c)throw new Error("Destination format not determined");let l=this.numberOfFrames,u=this.numberOfChannels,d=o??0;if(d>=l)throw new RangeError("frameOffset out of range");let f=s!==void 0?s:l-d;if(f>l-d)throw new RangeError("frameCount out of range");let h=ze(c),m=Tt(c);if(m&&n>=u)throw new RangeError("planeIndex out of range");if(!m&&n!==0)throw new RangeError("planeIndex out of range");let w=(m?f:f*u)*h;if(e.byteLength<w)throw new RangeError("Destination buffer is too small");let y=L(e),b=to(c);if(yr(this._data))st()&&u>2&&c!==a?xa(this._data,y,a,c,u,n,d,f):this._data.copyTo(e,{planeIndex:n,frameOffset:d,frameCount:f,format:c});else{let A=eo(a),S=ze(a),T=Tt(a),v;if(this._data instanceof At){let _=k=>{let B=this._data.getDataPlane(k);if(!(B instanceof Uint8Array))throw new TypeError("getDataPlane() must return a Uint8Array.");let F=l*S*(T?1:u);if(B.byteLength!==F)throw new TypeError(`Data plane ${k} has invalid size. Expected exactly ${F} bytes, got ${B.byteLength} bytes.`);return B};if(T)if(m)v=_(n),n=0;else{v=new Uint8Array(l*S*u);for(let k=0;k<u;k++){let B=_(k);v.set(B,k*l*S)}}else v=_(0)}else v=this._data;let I=L(v);for(let _=0;_<f;_++)if(m){let k=_*h,B;T?B=(n*l+(_+d))*S:B=((_+d)*u+n)*S;let F=A(I,B);b(y,k,F)}else for(let k=0;k<u;k++){let F=(_*u+k)*h,z;T?z=(k*l+(_+d))*S:z=((_+d)*u+k)*S;let U=A(I,z);b(y,F,U)}}}clone(){if(this._closed)throw new Error("AudioSample is closed.");if(this._data instanceof At){let e=new t(this._data);return e.setTimestamp(this.timestamp),e}else if(yr(this._data)){let e=new t(this._data.clone());return e.setTimestamp(this.timestamp),e}else return new t({format:this.format,sampleRate:this.sampleRate,numberOfFrames:this.numberOfFrames,numberOfChannels:this.numberOfChannels,timestamp:this.timestamp,data:this._data})}trim(e,r=this.numberOfFrames){if(!Number.isInteger(e)||e<0)throw new TypeError("startSample must be a non-negative integer.");if(!Number.isInteger(r)||r<0)throw new TypeError("endSample must be a non-negative integer.");if(e>this.numberOfFrames)throw new RangeError("startSample out of range.");if(r>this.numberOfFrames)throw new RangeError("endSample out of range.");if(r<e)throw new RangeError("endSample must not be less than startSample.");if(this._closed)throw new Error("AudioSample is closed.");let i=r-e,s=ze(this.format),o;if(Tt(this.format)){let n=i*s;if(o=new Uint8Array(n*this.numberOfChannels),i>0)for(let a=0;a<this.numberOfChannels;a++)this.copyTo(o.subarray(a*n,(a+1)*n),{planeIndex:a,format:this.format,frameOffset:e,frameCount:i})}else o=new Uint8Array(i*this.numberOfChannels*s),i>0&&this.copyTo(o,{planeIndex:0,format:this.format,frameOffset:e,frameCount:i});return new t({data:o,format:this.format,sampleRate:this.sampleRate,numberOfChannels:this.numberOfChannels,timestamp:this.timestamp+e/this.sampleRate})}close(){this._closed||(Ar?.unregister(this),this._data instanceof At?(this._data._referenceCount--,this._data._referenceCount===0&&this._data.close()):yr(this._data)?this._data.close():this._data=new Uint8Array(0),this._closed=!0)}toAudioData(){if(this._closed)throw new Error("AudioSample is closed.");return this._data instanceof At?this._createAudioDataFromData():yr(this._data)?this._data.timestamp===this.microsecondTimestamp?this._data.clone():this._createAudioDataFromData():new AudioData({format:this.format,sampleRate:this.sampleRate,numberOfFrames:this.numberOfFrames,numberOfChannels:this.numberOfChannels,timestamp:this.microsecondTimestamp,data:this._data.buffer instanceof ArrayBuffer?this._data.buffer:this._data.slice()})}_createAudioDataFromData(){if(Tt(this.format)){let e=this.allocationSize({planeIndex:0,format:this.format}),r=new ArrayBuffer(e*this.numberOfChannels);for(let i=0;i<this.numberOfChannels;i++)this.copyTo(new Uint8Array(r,i*e,e),{planeIndex:i,format:this.format});return new AudioData({format:this.format,sampleRate:this.sampleRate,numberOfFrames:this.numberOfFrames,numberOfChannels:this.numberOfChannels,timestamp:this.microsecondTimestamp,data:r})}else{let e=new ArrayBuffer(this.allocationSize({planeIndex:0,format:this.format}));return this.copyTo(e,{planeIndex:0,format:this.format}),new AudioData({format:this.format,sampleRate:this.sampleRate,numberOfFrames:this.numberOfFrames,numberOfChannels:this.numberOfChannels,timestamp:this.microsecondTimestamp,data:e})}}toAudioBuffer(){if(this._closed)throw new Error("AudioSample is closed.");let e=new AudioBuffer({numberOfChannels:this.numberOfChannels,length:this.numberOfFrames,sampleRate:this.sampleRate}),r=new Float32Array(this.allocationSize({planeIndex:0,format:"f32-planar"})/4);for(let i=0;i<this.numberOfChannels;i++)this.copyTo(r,{planeIndex:i,format:"f32-planar"}),e.copyToChannel(r,i);return e}setTimestamp(e){if(!Number.isFinite(e))throw new TypeError("newTimestamp must be a number.");this.timestamp=e}[Symbol.dispose](){this.close()}static*_fromAudioBuffer(e,r){if(!(e instanceof AudioBuffer))throw new TypeError("audioBuffer must be an AudioBuffer.");let i=48e3*5,s=e.numberOfChannels,o=e.sampleRate,n=e.length,a=Math.floor(i/s),c=0,l=n;for(;l>0;){let u=Math.min(a,l),d=new Float32Array(s*u);for(let f=0;f<s;f++)e.copyFromChannel(d.subarray(f*u,(f+1)*u),f,c);yield new t({format:"f32-planar",sampleRate:o,numberOfFrames:u,numberOfChannels:s,timestamp:r+c/o,data:d}),c+=u,l-=u}}static fromAudioBuffer(e,r){if(!(e instanceof AudioBuffer))throw new TypeError("audioBuffer must be an AudioBuffer.");let i=48e3*5,s=e.numberOfChannels,o=e.sampleRate,n=e.length,a=Math.floor(i/s),c=0,l=n,u=[];for(;l>0;){let d=Math.min(a,l),f=new Float32Array(s*d);for(let m=0;m<s;m++)e.copyFromChannel(f.subarray(m*d,(m+1)*d),m,c);let h=new t({format:"f32-planar",sampleRate:o,numberOfFrames:d,numberOfChannels:s,timestamp:r+c/o,data:f});u.push(h),c+=d,l-=d}return u}},ze=t=>{switch(t){case"u8":case"u8-planar":return 1;case"s16":case"s16-planar":return 2;case"s32":case"s32-planar":return 4;case"f32":case"f32-planar":return 4;default:throw new Error("Unknown AudioSampleFormat")}},Tt=t=>{switch(t){case"u8-planar":case"s16-planar":case"s32-planar":case"f32-planar":return!0;default:return!1}},eo=t=>{switch(t){case"u8":case"u8-planar":return(e,r)=>(e.getUint8(r)-128)/128;case"s16":case"s16-planar":return(e,r)=>e.getInt16(r,!0)/32768;case"s32":case"s32-planar":return(e,r)=>e.getInt32(r,!0)/2147483648;case"f32":case"f32-planar":return(e,r)=>e.getFloat32(r,!0)}},to=t=>{switch(t){case"u8":case"u8-planar":return(e,r,i)=>e.setUint8(r,K((i+1)*127.5,0,255));case"s16":case"s16-planar":return(e,r,i)=>e.setInt16(r,K(Math.round(i*32767),-32768,32767),!0);case"s32":case"s32-planar":return(e,r,i)=>e.setInt32(r,K(Math.round(i*2147483647),-2147483648,2147483647),!0);case"f32":case"f32-planar":return(e,r,i)=>e.setFloat32(r,i,!0)}},yr=t=>typeof AudioData<"u"&&t instanceof AudioData,ro=t=>{switch(t){case"u8-planar":return"u8";case"s16-planar":return"s16";case"s32-planar":return"s32";case"f32-planar":return"f32";default:return t}},xa=(t,e,r,i,s,o,n,a)=>{let c=eo(r),l=to(i),u=ze(r),d=ze(i),f=Tt(r);if(Tt(i))if(f){let m=new ArrayBuffer(a*u),g=L(m);t.copyTo(m,{planeIndex:o,frameOffset:n,frameCount:a,format:r});for(let w=0;w<a;w++){let y=w*u,b=w*d,A=c(g,y);l(e,b,A)}}else{let m=new ArrayBuffer(a*s*u),g=L(m);t.copyTo(m,{planeIndex:0,frameOffset:n,frameCount:a,format:r});for(let w=0;w<a;w++){let y=(w*s+o)*u,b=w*d,A=c(g,y);l(e,b,A)}}else if(f){let m=a*u,g=new ArrayBuffer(m),w=L(g);for(let y=0;y<s;y++){t.copyTo(g,{planeIndex:y,frameOffset:n,frameCount:a,format:r});for(let b=0;b<a;b++){let A=b*u,S=(b*s+y)*d,T=c(w,A);l(e,S,T)}}}else{let m=new ArrayBuffer(a*s*u),g=L(m);t.copyTo(m,{planeIndex:0,frameOffset:n,frameCount:a,format:r});for(let w=0;w<a;w++)for(let y=0;y<s;y++){let b=w*s+y,A=b*u,S=b*d,T=c(g,A);l(e,S,T)}}},io=(t,e)=>{let r=t.allocationSize({format:e,planeIndex:0}),i=new ArrayBuffer(r);return t.copyTo(i,{format:e,planeIndex:0}),new fe({data:i,format:e,numberOfChannels:t.numberOfChannels,sampleRate:t.sampleRate,timestamp:t.timestamp,duration:t.duration})};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var no=new Map,so=new Map,oo=t=>{if(!t||typeof t!="object")throw new TypeError("Encoding config must be an object.");if(!le.includes(t.codec))throw new TypeError(`Invalid video codec '${t.codec}'. Must be one of: ${le.join(", ")}.`);if(!(t.bitrate instanceof xe)&&(!Number.isInteger(t.bitrate)||t.bitrate<=0))throw new TypeError("config.bitrate must be a positive integer or a quality.");if(t.keyFrameInterval!==void 0&&(!Number.isFinite(t.keyFrameInterval)||t.keyFrameInterval<0))throw new TypeError("config.keyFrameInterval, when provided, must be a non-negative number.");if(t.sizeChangeBehavior!==void 0&&!["deny","passThrough","fill","contain","cover"].includes(t.sizeChangeBehavior))throw new TypeError("config.sizeChangeBehavior, when provided, must be 'deny', 'passThrough', 'fill', 'contain' or 'cover'.");if(t.transform!==void 0){if(typeof t.transform!="object"||!t.transform)throw new TypeError("config.transform, when provided, must be an object.");if(t.transform.width!==void 0&&(!Number.isInteger(t.transform.width)||t.transform.width<=0))throw new TypeError("config.transform.width, when provided, must be a positive integer.");if(t.transform.height!==void 0&&(!Number.isInteger(t.transform.height)||t.transform.height<=0))throw new TypeError("config.transform.height, when provided, must be a positive integer.");if(t.transform.fit!==void 0&&!["fill","contain","cover"].includes(t.transform.fit))throw new TypeError('config.transform.fit, when provided, must be one of "fill", "contain", or "cover".');if(t.transform.width!==void 0&&t.transform.height!==void 0&&t.transform.fit===void 0&&!["fill","contain","cover"].includes(t.sizeChangeBehavior))throw new TypeError("When both config.transform.width and config.transform.height are provided, config.transform.fit must also be provided.");if(t.transform.fit!==void 0&&["fill","contain","cover"].includes(t.sizeChangeBehavior)&&t.transform.fit!==t.sizeChangeBehavior)throw new TypeError("config.transform.fit, when provided, cannot differ from config.sizeChangeBehavior when config.sizeChangeBehavior is 'fill', 'contain' or 'cover', as sizeChangeBehavior already determines the fitting algorithm.");if(t.transform.rotate!==void 0&&![0,90,180,270].includes(t.transform.rotate))throw new TypeError("config.transform.rotate, when provided, must be 0, 90, 180 or 270.");if(t.transform.crop!==void 0&&xt(t.transform.crop,"config.transform."),t.transform.process!==void 0&&typeof t.transform.process!="function")throw new TypeError("config.transform.process, when provided, must be a function.");if(t.transform.frameRate!==void 0&&(!Number.isFinite(t.transform.frameRate)||t.transform.frameRate<=0))throw new TypeError("config.transform.frameRate, when provided, must be a finite positive number.");if(t.transform.force!==void 0&&typeof t.transform.force!="boolean")throw new TypeError("config.transform.force, when provided, must be a boolean.")}if(t.onEncodedPacket!==void 0&&typeof t.onEncodedPacket!="function")throw new TypeError("config.onEncodedPacket, when provided, must be a function.");if(t.onEncoderConfig!==void 0&&typeof t.onEncoderConfig!="function")throw new TypeError("config.onEncoderConfig, when provided, must be a function.");if(t.onEncodedSample!==void 0&&typeof t.onEncodedSample!="function")throw new TypeError("config.onEncodedSample, when provided, must be a function.");ao(t.codec,t)},ao=(t,e)=>{if(!e||typeof e!="object")throw new TypeError("Encoding options must be an object.");if(e.alpha!==void 0&&!["discard","keep"].includes(e.alpha))throw new TypeError("options.alpha, when provided, must be 'discard' or 'keep'.");if(e.bitrateMode!==void 0&&!["constant","variable"].includes(e.bitrateMode))throw new TypeError("bitrateMode, when provided, must be 'constant' or 'variable'.");if(e.latencyMode!==void 0&&!["quality","realtime"].includes(e.latencyMode))throw new TypeError("latencyMode, when provided, must be 'quality' or 'realtime'.");if(e.fullCodecString!==void 0&&typeof e.fullCodecString!="string")throw new TypeError("fullCodecString, when provided, must be a string.");if(e.fullCodecString!==void 0&&Oi(e.fullCodecString)!==t)throw new TypeError(`fullCodecString, when provided, must be a string that matches the specified codec (${t}).`);if(e.hardwareAcceleration!==void 0&&!["no-preference","prefer-hardware","prefer-software"].includes(e.hardwareAcceleration))throw new TypeError("hardwareAcceleration, when provided, must be 'no-preference', 'prefer-hardware' or 'prefer-software'.");if(e.scalabilityMode!==void 0&&typeof e.scalabilityMode!="string")throw new TypeError("scalabilityMode, when provided, must be a string.");if(e.contentHint!==void 0&&typeof e.contentHint!="string")throw new TypeError("contentHint, when provided, must be a string.")},Zi=t=>{let e=t.bitrate instanceof xe?t.bitrate._toVideoBitrate(t.codec,t.width,t.height):t.bitrate;return{codec:t.fullCodecString??es(t.codec,t.width,t.height,e,t.alpha==="keep"),width:t.width,height:t.height,displayWidth:t.squarePixelWidth,displayHeight:t.squarePixelHeight,bitrate:e,bitrateMode:t.bitrateMode,alpha:t.alpha??"discard",framerate:t.framerate,latencyMode:t.latencyMode,hardwareAcceleration:t.hardwareAcceleration,scalabilityMode:t.scalabilityMode,contentHint:t.contentHint,...as(t.codec)}},co=t=>{if(!t||typeof t!="object")throw new TypeError("Encoding config must be an object.");if(!he.includes(t.codec))throw new TypeError(`Invalid audio codec '${t.codec}'. Must be one of: ${he.join(", ")}.`);if(t.bitrate===void 0&&!(te.includes(t.codec)||t.codec==="flac"))throw new TypeError("config.bitrate must be provided for compressed audio codecs.");if(t.bitrate!==void 0&&!(t.bitrate instanceof xe)&&(!Number.isInteger(t.bitrate)||t.bitrate<=0))throw new TypeError("config.bitrate, when provided, must be a positive integer or a quality.");if(t.transform!==void 0){if(typeof t.transform!="object"||!t.transform)throw new TypeError("config.transform, when provided, must be an object.");if(t.transform.numberOfChannels!==void 0&&(!Number.isInteger(t.transform.numberOfChannels)||t.transform.numberOfChannels<=0))throw new TypeError("config.transform.numberOfChannels, when provided, must be a positive integer.");if(t.transform.sampleRate!==void 0&&(!Number.isInteger(t.transform.sampleRate)||t.transform.sampleRate<=0))throw new TypeError("config.transform.sampleRate, when provided, must be a positive integer.");if(t.transform.sampleFormat!==void 0&&!["u8","s16","s32","f32"].includes(t.transform.sampleFormat))throw new TypeError("config.transform.sampleFormat, when provided, must be one of: u8, s16, s32, f32.");if(t.transform.process!==void 0&&typeof t.transform.process!="function")throw new TypeError("config.transform.process, when provided, must be a function.")}if(t.onEncodedPacket!==void 0&&typeof t.onEncodedPacket!="function")throw new TypeError("config.onEncodedPacket, when provided, must be a function.");if(t.onEncoderConfig!==void 0&&typeof t.onEncoderConfig!="function")throw new TypeError("config.onEncoderConfig, when provided, must be a function.");if(t.onEncodedSample!==void 0&&typeof t.onEncodedSample!="function")throw new TypeError("config.onEncodedSample, when provided, must be a function.");uo(t.codec,t)},uo=(t,e)=>{if(!e||typeof e!="object")throw new TypeError("Encoding options must be an object.");if(e.bitrateMode!==void 0&&!["constant","variable"].includes(e.bitrateMode))throw new TypeError("bitrateMode, when provided, must be 'constant' or 'variable'.");if(e.fullCodecString!==void 0&&typeof e.fullCodecString!="string")throw new TypeError("fullCodecString, when provided, must be a string.");if(e.fullCodecString!==void 0&&Oi(e.fullCodecString)!==t)throw new TypeError(`fullCodecString, when provided, must be a string that matches the specified codec (${t}).`)},Ji=t=>{let e=t.bitrate instanceof xe?t.bitrate._toAudioBitrate(t.codec):t.bitrate;return{codec:t.fullCodecString??is(t.codec,t.numberOfChannels,t.sampleRate),numberOfChannels:t.numberOfChannels,sampleRate:t.sampleRate,bitrate:e,bitrateMode:t.bitrateMode,...cs(t.codec)}},xe=class{constructor(e){this._factor=e}_toVideoBitrate(e,r,i){let s=r*i,o=1920*1080,n=3e6,a=Math.pow(s/o,.95),c=n*a,l={avc:1,hevc:.6,vp9:.6,av1:.4,vp8:1.2,prores:22e7/n},d=c*l[e]*this._factor;return Math.ceil(d/1e3)*1e3}_toAudioBitrate(e){if(te.includes(e)||e==="flac")return;let i={aac:128e3,opus:64e3,mp3:16e4,vorbis:64e3,ac3:384e3,eac3:192e3}[e];if(!i)throw new Error(`Unhandled codec: ${e}`);let s=i*this._factor;return e==="aac"?s=[96e3,128e3,16e4,192e3].reduce((n,a)=>Math.abs(a-s)<Math.abs(n-s)?a:n):e==="opus"||e==="vorbis"?s=Math.max(6e3,s):e==="mp3"&&(s=[8e3,16e3,24e3,32e3,4e4,48e3,64e3,8e4,96e3,112e3,128e3,16e4,192e3,224e3,256e3,32e4].reduce((n,a)=>Math.abs(a-s)<Math.abs(n-s)?a:n)),Math.round(s/1e3)*1e3}};var en=new xe(2);var _a=async(t,e={})=>{let{width:r=1280,height:i=720,bitrate:s=1e6,...o}=e;if(!le.includes(t))return!1;if(!Number.isInteger(r)||r<=0)throw new TypeError("width must be a positive integer.");if(!Number.isInteger(i)||i<=0)throw new TypeError("height must be a positive integer.");if(!(s instanceof xe)&&(!Number.isInteger(s)||s<=0))throw new TypeError("bitrate must be a positive integer or a quality.");ao(t,o);let n=Zi({codec:t,width:r,height:i,bitrate:s,framerate:void 0,...o,alpha:"discard"}),a=JSON.stringify(n),c=no.get(a);if(c)return c;let l=(async()=>ei.some(f=>f.supports(t,n))?!0:typeof VideoEncoder>"u"||(r%2===1||i%2===1)&&(t==="avc"||t==="hevc")||!(await VideoEncoder.isConfigSupported(n)).supported?!1:or()?new Promise(async f=>{try{let h=new VideoEncoder({output:()=>{},error:()=>f(!1)});h.configure(n);let m=new Uint8Array(r*i*4),g=new VideoFrame(m,{format:"RGBA",codedWidth:r,codedHeight:i,timestamp:0});h.encode(g),g.close(),await h.flush(),f(!0)}catch{f(!1)}}):!0)();return no.set(a,l),l},Sa=async(t,e={})=>{let{numberOfChannels:r=2,sampleRate:i=48e3,bitrate:s=128e3,...o}=e;if(!he.includes(t))return!1;if(!Number.isInteger(r)||r<=0)throw new TypeError("numberOfChannels must be a positive integer.");if(!Number.isInteger(i)||i<=0)throw new TypeError("sampleRate must be a positive integer.");if(!(s instanceof xe)&&(!Number.isInteger(s)||s<=0))throw new TypeError("bitrate must be a positive integer.");uo(t,o);let n=Ji({codec:t,numberOfChannels:r,sampleRate:i,bitrate:s,...o}),a=JSON.stringify(n),c=so.get(a);if(c)return c;let l=(async()=>ti.some(d=>d.supports(t,n))||te.includes(t)?!0:typeof AudioEncoder>"u"?!1:(await AudioEncoder.isConfigSupported(n)).supported===!0)();return so.set(a,l),l};var tn=async(t=he,e)=>{let r=await Promise.all(t.map(i=>Sa(i,e)));return t.filter((i,s)=>r[s])};var lo=async(t,e)=>{for(let r of t)if(await _a(r,e))return r;return null};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var ri=[],ii=[],ei=[],ti=[];/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var fo=t=>{let i=t,s=4096,o=0,n=12,a=0;for(i<0&&(i=-i,o=128),i+=33,i>8191&&(i=8191);(i&s)!==s&&n>=5;)s>>=1,n--;return a=i>>n-4&15,~(o|n-5<<4|a)&255},ho=t=>{let r=0,i=0,s=~t;s&128&&(s&=-129,r=-1),i=((s&240)>>4)+5;let o=(1<<i|(s&15)<<i-4|1<<i-5)-33;return r===0?o:-o},mo=t=>{let r=2048,i=0,s=11,o=0,n=t;for(n<0&&(n=-n,i=128),n>4095&&(n=4095);(n&r)!==r&&s>=5;)r>>=1,s--;return o=n>>(s===4?1:s-4)&15,(i|s-4<<4|o)^85},po=t=>{let e=0,r=0,i=t^85;i&128&&(i&=-129,e=-1),r=((i&240)>>4)+4;let s=0;return r!==4?s=1<<r|(i&15)<<r-4|1<<r-5:s=i<<1|1,e===0?s:-s};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var _t=t=>{if(!t||typeof t!="object")throw new TypeError("options must be an object.");if(t.metadataOnly!==void 0&&typeof t.metadataOnly!="boolean")throw new TypeError("options.metadataOnly, when defined, must be a boolean.");if(t.verifyKeyPackets!==void 0&&typeof t.verifyKeyPackets!="boolean")throw new TypeError("options.verifyKeyPackets, when defined, must be a boolean.");if(t.verifyKeyPackets&&t.metadataOnly)throw new TypeError("options.verifyKeyPackets and options.metadataOnly cannot be enabled together.");if(t.skipLiveWait!==void 0&&typeof t.skipLiveWait!="boolean")throw new TypeError("options.skipLiveWait, when defined, must be a boolean.")},St=t=>{if(!Rr(t))throw new TypeError("timestamp must be a number.")},rn=(t,e,r)=>r.verifyKeyPackets?e.then(async i=>{if(!i||i.type==="delta")return i;let s=await t.determinePacketType(i);return s&&(i.type=s),i}):e,Ye=class{constructor(e){if(!(e instanceof qt))throw new TypeError("track must be an InputTrack.");this._track=e}async getFirstPacket(e={}){if(_t(e),this._track.input._disposed)throw new oe;return rn(this._track,this._track._backing.getFirstPacket(e),e)}async getFirstKeyPacket(e={}){_t(e);let r=await this.getFirstPacket(e);return r?r.type==="key"?r:this.getNextKeyPacket(r,e):null}async getPacket(e,r={}){if(St(e),_t(r),this._track.input._disposed)throw new oe;return rn(this._track,this._track._backing.getPacket(e,r),r)}async getNextPacket(e,r={}){if(!(e instanceof ee))throw new TypeError("packet must be an EncodedPacket.");if(_t(r),this._track.input._disposed)throw new oe;return rn(this._track,this._track._backing.getNextPacket(e,r),r)}async getKeyPacket(e,r={}){if(St(e),_t(r),this._track.input._disposed)throw new oe;if(!r.verifyKeyPackets)return this._track._backing.getKeyPacket(e,r);let i=await this._track._backing.getKeyPacket(e,r);return i&&(p(i.type==="key"),await this._track.determinePacketType(i)==="delta"?this.getKeyPacket(i.timestamp-1/await this._track.getTimeResolution(),r):i)}async getNextKeyPacket(e,r={}){if(!(e instanceof ee))throw new TypeError("packet must be an EncodedPacket.");if(_t(r),this._track.input._disposed)throw new oe;if(!r.verifyKeyPackets)return this._track._backing.getNextKeyPacket(e,r);let i=await this._track._backing.getNextKeyPacket(e,r);return i&&(p(i.type==="key"),await this._track.determinePacketType(i)==="delta"?this.getNextKeyPacket(i,r):i)}packets(e,r,i={}){if(e!==void 0&&!(e instanceof ee))throw new TypeError("startPacket must be an EncodedPacket.");if(e!==void 0&&e.isMetadataOnly&&!i?.metadataOnly)throw new TypeError("startPacket can only be metadata-only if options.metadataOnly is enabled.");if(r!==void 0&&!(r instanceof ee))throw new TypeError("endPacket must be an EncodedPacket.");if(_t(i),this._track.input._disposed)throw new oe;let s=[],{promise:o,resolve:n}=Y(),{promise:a,resolve:c}=Y(),l=!1,u=!1,d=null,f=!1,h=[],m=()=>Math.max(2,h.length);(async()=>{let w=e??await this.getFirstPacket(i);for(;w&&!u&&!this._track.input._disposed&&!(r&&w.sequenceNumber>=r?.sequenceNumber);){if(s.length>m()){({promise:a,resolve:c}=Y()),await a;continue}s.push(w),n(),{promise:o,resolve:n}=Y(),w=await this.getNextPacket(w,i)}l=!0,n()})().catch(w=>{f||(d=w,f=!0,n())});let g=this._track;return{async next(){for(;;){if(g.input._disposed)throw new oe;if(u)return{value:void 0,done:!0};if(f)throw d;if(s.length>0){let w=s.shift(),y=performance.now();for(h.push(y);h.length>0&&y-h[0]>=1e3;)h.shift();return c(),{value:w,done:!1}}else{if(l)return{value:void 0,done:!0};await o}}},async return(){return u=!0,c(),n(),{value:void 0,done:!0}},async throw(w){throw w},[Symbol.asyncIterator](){return this}}}},xr=class{constructor(e,r){this.onSample=e,this.onError=r}},ni=class{mediaSamplesInRange(e=-1/0,r=1/0,i){St(e),St(r);let s=[],o=!1,n=null,{promise:a,resolve:c}=Y(),{promise:l,resolve:u}=Y(),d=!1,f=!1,h=!1,m=null,g=!1,w={...i,verifyKeyPackets:!0,metadataOnly:!1};(async()=>{let A=await this._createDecoder(k=>{if(u(),k.timestamp>=r&&(f=!0),f){k.close();return}n&&(k.timestamp>e?(s.push(n),o=!0):n.close()),k.timestamp>=e&&(s.push(k),o=!0),n=o?null:k,s.length>0&&(c(),{promise:a,resolve:c}=Y())},k=>{g||(m=k,g=!0,c())}),S=this._createPacketSink(),T=await S.getKeyPacket(e,w)??await S.getFirstKeyPacket(w),v=T,_=S.packets(T??void 0,void 0,w);for(await _.next();v&&!f&&!this._track.input._disposed;){let k=go(s.length);if(s.length+A.getDecodeQueueSize()>k){({promise:l,resolve:u}=Y()),await l;continue}A.decode(v);let B=await _.next();if(B.done)break;v=B.value}await _.return(),!h&&!this._track.input._disposed&&await A.flush(),A.close(),!o&&n&&s.push(n),d=!0,c()})().catch(A=>{g||(m=A,g=!0,c())});let y=this._track,b=()=>{n?.close();for(let A of s)A.close()};return{async next(){for(;;){if(y.input._disposed)throw b(),new oe;if(h)return{value:void 0,done:!0};if(g)throw b(),m;if(s.length>0){let A=s.shift();return u(),{value:A,done:!1}}else if(!d)await a;else return{value:void 0,done:!0}}},async return(){return h=!0,f=!0,u(),c(),b(),{value:void 0,done:!0}},async throw(A){throw A},[Symbol.asyncIterator](){return this}}}mediaSamplesAtTimestamps(e,r){Un(e);let i=Vn(e),s=[],o=[],{promise:n,resolve:a}=Y(),{promise:c,resolve:l}=Y(),u=!1,d=!1,f=null,h=!1,m=b=>{o.push(b),a(),{promise:n,resolve:a}=Y()},g={...r,verifyKeyPackets:!0,metadataOnly:!1};(async()=>{let b=await this._createDecoder(k=>{if(l(),d){k.close();return}let B=0;for(;s.length>0&&k.timestamp-s[0]>-1e-10;)B++,s.shift();if(B>0)for(let F=0;F<B;F++)m(F<B-1?k.clone():k);else k.close()},k=>{h||(f=k,h=!0,a())}),A=this._createPacketSink(),S=null,T=null,v=-1,I=async()=>{p(T);let k=T;for(b.decode(k);k.sequenceNumber<v;){let B=go(o.length);for(;o.length+b.getDecodeQueueSize()>B&&!d;)({promise:c,resolve:l}=Y()),await c;if(d)break;let F=await A.getNextPacket(k,g);p(F),b.decode(F),k=F}v=-1},_=async()=>{await b.flush();for(let k=0;k<s.length;k++)m(null);s.length=0};for await(let k of i){if(St(k),d||this._track.input._disposed)break;let B=await A.getPacket(k,g),F=B&&await A.getKeyPacket(k,g);if(!F){v!==-1&&(await I(),await _()),m(null),S=null;continue}S&&(F.sequenceNumber!==T.sequenceNumber||B.timestamp<S.timestamp)&&(await I(),await _()),s.push(B.timestamp),v=Math.max(B.sequenceNumber,v),S=B,T=F}!d&&!this._track.input._disposed&&(v!==-1&&await I(),await _()),b.close(),u=!0,a()})().catch(b=>{h||(f=b,h=!0,a())});let w=this._track,y=()=>{for(let b of o)b?.close()};return{async next(){for(;;){if(w.input._disposed)throw y(),new oe;if(d)return{value:void 0,done:!0};if(h)throw y(),f;if(o.length>0){let b=o.shift();return p(b!==void 0),l(),{value:b,done:!1}}else if(!u)await n;else return{value:void 0,done:!0}}},async return(){return d=!0,l(),a(),y(),{value:void 0,done:!0}},async throw(b){throw b},[Symbol.asyncIterator](){return this}}}},go=t=>t===0?40:8,sn=class extends xr{constructor(e,r,i,s,o,n){super(e,r),this.codec=i,this.decoderConfig=s,this.rotation=o,this.timeResolution=n,this.decoder=null,this.customDecoder=null,this.customDecoderCallSerializer=new rt,this.customDecoderQueueSize=0,this.inputTimestamps=[],this.sampleQueue=[],this.currentPacketIndex=0,this.raslSkipped=!1,this.alphaDecoder=null,this.alphaHadKeyframe=!1,this.colorQueue=[],this.alphaQueue=[],this.merger=null,this.decodedAlphaChunkCount=0,this.alphaDecoderQueueSize=0,this.nullAlphaFrameQueue=[],this.currentAlphaPacketIndex=0,this.alphaRaslSkipped=!1,this.finalSamples=[],this.mergeAlphaPromises=[];let a=ri.find(c=>c.supports(i,s));if(a)this.customDecoder=new a,this.customDecoder.codec=i,this.customDecoder.config=s,this.customDecoder.onSample=c=>{if(!(c instanceof Ie))throw new TypeError("The argument passed to onSample must be a VideoSample.");this.finalizeAndEmitSample(c)},this.customDecoder.onError=c=>{r(c)},this.customDecoderCallSerializer.call(()=>this.customDecoder.init()).catch(c=>r(c));else{let c=u=>{if(this.alphaQueue.length>0){let d=this.alphaQueue.shift();p(d!==void 0),this.mergeAlpha(u,d)}else this.colorQueue.push(u)};if(i==="avc"&&this.decoderConfig.description&&ar()){let u=bs(ie(this.decoderConfig.description));if(u&&u.sequenceParameterSets.length>0){let d=Li(u.sequenceParameterSets[0]);d&&d.frameMbsOnlyFlag===0&&(this.decoderConfig={...this.decoderConfig,hardwareAcceleration:"prefer-software"})}}let l=new Error("Decoding error").stack;this.decoder=new VideoDecoder({output:u=>{try{c(u)}catch(d){this.onError(d)}},error:u=>{u.stack=l,this.onError(u)}}),this.decoder.configure(this.decoderConfig)}}getDecodeQueueSize(){return this.customDecoder?this.customDecoderQueueSize:(p(this.decoder),Math.max(this.decoder.decodeQueueSize,this.alphaDecoder?.decodeQueueSize??0))}decode(e){if(this.codec==="hevc"&&this.currentPacketIndex>0&&!this.raslSkipped){if(this.hasHevcRaslPicture(e.data))return;this.raslSkipped=!0}if(this.customDecoder)this.customDecoderQueueSize++,this.customDecoderCallSerializer.call(()=>this.customDecoder.decode(e)).catch(r=>this.onError(r)).finally(()=>this.customDecoderQueueSize--);else{if(p(this.decoder),st()||Pi(this.inputTimestamps,e.timestamp,r=>r),ar()&&this.currentPacketIndex===0){if(this.codec==="avc"){let r=[],i=!1;for(let o of Ui(e.data,this.decoderConfig)){let n=Dr(e.data[o.offset]);if(i||=n>=1&&n<=5,n===Ce.AUD){if(i)break;r.length=0}n>=20&&n<=31||r.push(e.data.subarray(o.offset,o.offset+o.length))}let s=gs(r,this.decoderConfig);e=new ee(s,e.type,e.timestamp,e.duration)}else if(this.codec==="hevc"){let r=_s(e.data,this.decoderConfig);r&&(e=new ee(r,e.type,e.timestamp,e.duration))}}this.decoder.decode(e.toEncodedVideoChunk()),this.decodeAlphaData(e)}this.currentPacketIndex++}decodeAlphaData(e){if(!e.sideData.alpha){this.pushNullAlphaFrame();return}if(this.merger||(this.merger=new on),!this.alphaDecoder){let i=o=>{if(this.colorQueue.length>0){let n=this.colorQueue.shift();p(n!==void 0),this.mergeAlpha(n,o)}else this.alphaQueue.push(o);for(this.decodedAlphaChunkCount++;this.nullAlphaFrameQueue.length>0&&this.nullAlphaFrameQueue[0]===this.decodedAlphaChunkCount;)if(this.nullAlphaFrameQueue.shift(),this.colorQueue.length>0){let n=this.colorQueue.shift();p(n!==void 0),this.mergeAlpha(n,null)}else this.alphaQueue.push(null);this.alphaDecoderQueueSize--},s=new Error("Decoding error").stack;this.alphaDecoder=new VideoDecoder({output:o=>{try{i(o)}catch(n){this.onError(n)}},error:o=>{o.stack=s,this.onError(o)}}),this.alphaDecoder.configure(this.decoderConfig)}let r=Vt(this.codec,this.decoderConfig,e.sideData.alpha);if(this.alphaHadKeyframe||(this.alphaHadKeyframe=r==="key"),this.alphaHadKeyframe){if(this.codec==="hevc"&&this.currentAlphaPacketIndex>0&&!this.alphaRaslSkipped){if(this.hasHevcRaslPicture(e.sideData.alpha)){this.pushNullAlphaFrame();return}this.alphaRaslSkipped=!0}this.currentAlphaPacketIndex++,this.alphaDecoder.decode(e.alphaToEncodedVideoChunk(r??e.type)),this.alphaDecoderQueueSize++}else this.pushNullAlphaFrame()}pushNullAlphaFrame(){this.alphaDecoderQueueSize===0?this.alphaQueue.push(null):this.nullAlphaFrameQueue.push(this.decodedAlphaChunkCount+this.alphaDecoderQueueSize)}hasHevcRaslPicture(e){for(let r of fr(e,this.decoderConfig)){let i=Ot(e[r.offset]);if(i===de.RASL_N||i===de.RASL_R)return!0}return!1}sampleHandler(e){if(st()){if(this.sampleQueue.length>0&&e.timestamp>=X(this.sampleQueue).timestamp){for(let r of this.sampleQueue)this.finalizeAndEmitSample(r);this.sampleQueue.length=0}Pi(this.sampleQueue,e,r=>r.timestamp)}else{let r=this.inputTimestamps.shift();p(r!==void 0),e.setTimestamp(r),this.finalizeAndEmitSample(e)}}finalizeAndEmitSample(e){e.setTimestamp(Math.round(e.timestamp*this.timeResolution)/this.timeResolution),e.setDuration(Math.round(e.duration*this.timeResolution)/this.timeResolution),e.setRotation(this.rotation),this.onSample(e)}async mergeAlpha(e,r){let i=Y();this.mergeAlphaPromises.push(i.promise);let s={sample:null};this.finalSamples.push(s);try{if(!r)s.sample=new Ie(e);else{p(this.merger);let o=await this.merger.merge(e,r);s.sample=new Ie(o)}for(;this.finalSamples.length>0&&this.finalSamples[0].sample!==null;){let o=this.finalSamples.shift();this.sampleHandler(o.sample)}}catch(o){tr(this.finalSamples,s),this.onError(o)}finally{tr(this.mergeAlphaPromises,i.promise),i.resolve()}}async flush(){if(this.customDecoder?await this.customDecoderCallSerializer.call(()=>this.customDecoder.flush()):(p(this.decoder),await Promise.all([this.decoder.flush(),this.alphaDecoder?.flush()]),await Promise.all(this.mergeAlphaPromises),this.colorQueue.forEach(e=>e.close()),this.colorQueue.length=0,this.alphaQueue.forEach(e=>e?.close()),this.alphaQueue.length=0,this.alphaHadKeyframe=!1,this.decodedAlphaChunkCount=0,this.alphaDecoderQueueSize=0,this.nullAlphaFrameQueue.length=0,this.currentAlphaPacketIndex=0,this.alphaRaslSkipped=!1),st()){for(let e of this.sampleQueue)this.finalizeAndEmitSample(e);this.sampleQueue.length=0}this.currentPacketIndex=0,this.raslSkipped=!1}close(){this.customDecoder?this.customDecoderCallSerializer.call(()=>this.customDecoder.close()):(p(this.decoder),this.decoder.close(),this.alphaDecoder?.close(),this.colorQueue.forEach(e=>e.close()),this.colorQueue.length=0,this.alphaQueue.forEach(e=>e?.close()),this.alphaQueue.length=0,this.merger?.close());for(let e of this.sampleQueue)e.close();this.sampleQueue.length=0}},nn=null,on=class{constructor(){this.workers=[],this.nextWorkerIndex=0,this.pendingRequests=new Map,this.nextRequestId=0}merge(e,r){if(this.workers.length===0){if(!nn){let a=new Blob([`(${ka.toString()})()`],{type:"application/javascript"});nn=URL.createObjectURL(a)}let n=K(navigator.hardwareConcurrency,1,4);for(let a=0;a<n;a++){let c=new Worker(nn);c.addEventListener("message",l=>{let u=l.data,d=this.pendingRequests.get(u.id);d&&(this.pendingRequests.delete(u.id),"error"in u?d.reject(new Error(u.error)):d.resolve(u.frame))}),c.addEventListener("error",l=>{let u=new Error(l.message||"Color/alpha merge worker error.");for(let d of this.pendingRequests.values())d.reject(u);this.pendingRequests.clear()}),this.workers.push(c)}}let i=this.nextRequestId++,s=Y();this.pendingRequests.set(i,s);let o=this.workers[this.nextWorkerIndex];return this.nextWorkerIndex=(this.nextWorkerIndex+1)%this.workers.length,o.postMessage({id:i,color:e,alpha:r},{transfer:[e,r]}),s.promise}close(){for(let r of this.workers)r.terminate();this.workers.length=0;let e=new Error("Color/alpha merger closed.");for(let r of this.pendingRequests.values())r.reject(e);this.pendingRequests.clear()}},ka=()=>{let t=null,e=null,r=Promise.resolve();self.addEventListener("message",c=>{let{id:l,color:u,alpha:d}=c.data;r=r.then(async()=>{try{let f=await i(u,d);self.postMessage({id:l,frame:f},{transfer:[f]})}catch(f){self.postMessage({id:l,error:f.message})}finally{u.close(),d.close()}})});let i=async(c,l)=>{let u=c.format,d=l.format;if(!u||!d)throw new Error("CPU color/alpha merging requires a known VideoFrame format.");let f=u.includes("P10"),h=u.includes("P12"),m=d.includes("P10"),g=d.includes("P12");if(m!==f||g!==h)throw new Error(`CPU color/alpha merging requires the alpha frame to have the same bit depth as the color frame (color: '${u}', alpha: '${d}').`);if(u==="RGBX"||u==="RGBA"||u==="BGRX"||u==="BGRA")return await s(c,l,u);if(u==="I420"||u==="I420P10"||u==="I420P12"||u==="I422"||u==="I422P10"||u==="I422P12"||u==="I444"||u==="I444P10"||u==="I444P12")return await o(c,l,u);if(u==="NV12")return await n(c,l);throw new Error(`CPU color/alpha merging does not support format '${u}'.`)},s=async(c,l,u)=>{let d=c.visibleRect?.width??c.codedWidth,f=c.visibleRect?.height??c.codedHeight,h=d*f,m=new Uint8Array(h*4);await c.copyTo(m);let g=await a(l,d,f,1);for(let b=0,A=3;b<h;b++,A+=4)m[A]=g[b];let y={format:u==="RGBX"||u==="RGBA"?"RGBA":"BGRA",codedWidth:d,codedHeight:f,timestamp:c.timestamp,duration:c.duration??void 0,transfer:[m.buffer]};return new VideoFrame(m,y)},o=async(c,l,u)=>{let d=c.visibleRect?.width??c.codedWidth,f=c.visibleRect?.height??c.codedHeight,h=u.includes("P10"),m=u.includes("P12"),g=h||m?2:1,w,y;u.startsWith("I420")?(w=Math.ceil(d/2),y=Math.ceil(f/2)):u.startsWith("I422")?(w=Math.ceil(d/2),y=f):(w=d,y=f);let b=d*f,A=w*y,S=b*g,T=A*g,v=b*g,I=S+2*T+v,_=new Uint8Array(I);await c.copyTo(_);let k=await a(l,d,f,g),B=S+2*T;_.set(k,B);let z={format:u.slice(0,4)+"A"+u.slice(4),codedWidth:d,codedHeight:f,timestamp:c.timestamp,duration:c.duration??void 0,transfer:[_.buffer]};return new VideoFrame(_,z)},n=async(c,l)=>{let u=c.visibleRect?.width??c.codedWidth,d=c.visibleRect?.height??c.codedHeight,f=u*d,h=Math.ceil(u/2),m=Math.ceil(d/2),g=h*m,w=c.allocationSize();(!e||e.byteLength!==w)&&(e=new Uint8Array(w)),await c.copyTo(e);let y=new Uint8Array(f+2*g+f);y.set(e.subarray(0,f),0);let b=f,A=f+g,S=f;for(let I=0;I<g;I++)y[b+I]=e[S+I*2],y[A+I]=e[S+I*2+1];let T=await a(l,u,d,1);y.set(T,f+2*g);let v={format:"I420A",codedWidth:u,codedHeight:d,timestamp:c.timestamp,duration:c.duration??void 0,transfer:[y.buffer]};return new VideoFrame(y,v)},a=async(c,l,u,d)=>{let f=c.allocationSize();(!t||t.byteLength!==f)&&(t=new Uint8Array(f)),await c.copyTo(t);let h=c.format;if(h==="RGBA"||h==="BGRA"||h==="RGBX"||h==="BGRX"){let m=h==="RGBA"||h==="RGBX"?0:2,g=l*u;for(let w=0;w<g;w++)t[w]=t[w*4+m];return t.subarray(0,g)}else return t.subarray(0,l*u*d)}},Ca=t=>{if(!t||typeof t!="object")throw new TypeError("decoderOptions must be an object.");if(t.hardwareAcceleration!==void 0&&!["no-preference","prefer-hardware","prefer-software"].includes(t.hardwareAcceleration))throw new TypeError("decoderOptions.hardwareAcceleration, when provided, must be 'no-preference', 'prefer-hardware' or 'prefer-software'.");if(t.optimizeForLatency!==void 0&&typeof t.optimizeForLatency!="boolean")throw new TypeError("decoderOptions.optimizeForLatency, when provided, must be a boolean.")},_r=class extends ni{constructor(e,r={}){if(!(e instanceof kt))throw new TypeError("videoTrack must be an InputVideoTrack.");Ca(r),super(),this._track=e,this._decoderOptions=r}async _createDecoder(e,r){if(!await this._track.canDecode())throw new Error("This video track cannot be decoded by this browser. Make sure to check decodability before using a track.");let i=await this._track.getCodec(),s=await this._track.getRotation(),o=await this._track.getDecoderConfig(),n=await this._track.getTimeResolution();return p(i&&o),o={...o,hardwareAcceleration:this._decoderOptions.hardwareAcceleration,optimizeForLatency:this._decoderOptions.optimizeForLatency},new sn(e,r,i,o,s,n)}_createPacketSink(){return new Ye(this._track)}async getSample(e,r={}){St(e);for await(let i of this.mediaSamplesAtTimestamps([e],r))return i;throw new Error("Internal error: Iterator returned nothing.")}samples(e,r,i={}){return this.mediaSamplesInRange(e,r,i)}samplesAtTimestamps(e,r={}){return this.mediaSamplesAtTimestamps(e,r)}};var an=class extends xr{constructor(e,r,i,s){super(e,r),this.decoder=null,this.customDecoder=null,this.customDecoderCallSerializer=new rt,this.customDecoderQueueSize=0,this.currentTimestamp=null,this.expectedFirstTimestamp=null,this.timestampOffset=0;let o=a=>{let c=a.timestamp;this.expectedFirstTimestamp&&this.currentTimestamp===null&&(this.timestampOffset=this.expectedFirstTimestamp-c),c+=this.timestampOffset,(this.currentTimestamp===null||Math.abs(c-this.currentTimestamp)>=a.duration)&&(this.currentTimestamp=c);let l=this.currentTimestamp;if(this.currentTimestamp+=a.duration,a.numberOfFrames===0){a.close();return}let u=s.sampleRate;a.setTimestamp(Math.round(l*u)/u),e(a)},n=ii.find(a=>a.supports(i,s));if(n)this.customDecoder=new n,this.customDecoder.codec=i,this.customDecoder.config=s,this.customDecoder.onSample=a=>{if(!(a instanceof fe))throw new TypeError("The argument passed to onSample must be an AudioSample.");o(a)},this.customDecoder.onError=a=>{r(a)},this.customDecoderCallSerializer.call(()=>this.customDecoder.init()).catch(a=>r(a));else{let a=new Error("Decoding error").stack;this.decoder=new AudioDecoder({output:c=>{try{o(new fe(c))}catch(l){this.onError(l)}},error:c=>{c.stack=a,this.onError(c)}}),this.decoder.configure(s)}}getDecodeQueueSize(){return this.customDecoder?this.customDecoderQueueSize:(p(this.decoder),this.decoder.decodeQueueSize)}decode(e){this.customDecoder?(this.customDecoderQueueSize++,this.customDecoderCallSerializer.call(()=>this.customDecoder.decode(e)).catch(r=>this.onError(r)).finally(()=>this.customDecoderQueueSize--)):(p(this.decoder),this.expectedFirstTimestamp??=e.timestamp,this.decoder.decode(e.toEncodedAudioChunk()))}async flush(){this.customDecoder?await this.customDecoderCallSerializer.call(()=>this.customDecoder.flush()):(p(this.decoder),await this.decoder.flush()),this.currentTimestamp=null,this.expectedFirstTimestamp=null,this.timestampOffset=0}close(){this.customDecoder?this.customDecoderCallSerializer.call(()=>this.customDecoder.close()):(p(this.decoder),this.decoder.close())}},cn=class extends xr{constructor(e,r,i){super(e,r),this.decoderConfig=i,this.currentTimestamp=null,p(te.includes(i.codec)),this.codec=i.codec;let{dataType:s,sampleSize:o,littleEndian:n}=me(this.codec);switch(this.inputSampleSize=o,o){case 1:s==="unsigned"?this.readInputValue=(a,c)=>a.getUint8(c)-2**7:s==="signed"?this.readInputValue=(a,c)=>a.getInt8(c):s==="ulaw"?this.readInputValue=(a,c)=>ho(a.getUint8(c)):s==="alaw"?this.readInputValue=(a,c)=>po(a.getUint8(c)):p(!1);break;case 2:s==="unsigned"?this.readInputValue=(a,c)=>a.getUint16(c,n)-2**15:s==="signed"?this.readInputValue=(a,c)=>a.getInt16(c,n):p(!1);break;case 3:s==="unsigned"?this.readInputValue=(a,c)=>mt(a,c,n)-2**23:s==="signed"?this.readInputValue=(a,c)=>Ln(a,c,n):p(!1);break;case 4:s==="unsigned"?this.readInputValue=(a,c)=>a.getUint32(c,n)-2**31:s==="signed"?this.readInputValue=(a,c)=>a.getInt32(c,n):s==="float"?this.readInputValue=(a,c)=>a.getFloat32(c,n):p(!1);break;case 8:s==="float"?this.readInputValue=(a,c)=>a.getFloat64(c,n):p(!1);break;default:ae(o),p(!1)}switch(o){case 1:s==="ulaw"||s==="alaw"?(this.outputSampleSize=2,this.outputFormat="s16",this.writeOutputValue=(a,c,l)=>a.setInt16(c,l,!0)):(this.outputSampleSize=1,this.outputFormat="u8",this.writeOutputValue=(a,c,l)=>a.setUint8(c,l+2**7));break;case 2:this.outputSampleSize=2,this.outputFormat="s16",this.writeOutputValue=(a,c,l)=>a.setInt16(c,l,!0);break;case 3:this.outputSampleSize=4,this.outputFormat="s32",this.writeOutputValue=(a,c,l)=>a.setInt32(c,l<<8,!0);break;case 4:this.outputSampleSize=4,s==="float"?(this.outputFormat="f32",this.writeOutputValue=(a,c,l)=>a.setFloat32(c,l,!0)):(this.outputFormat="s32",this.writeOutputValue=(a,c,l)=>a.setInt32(c,l,!0));break;case 8:this.outputSampleSize=4,this.outputFormat="f32",this.writeOutputValue=(a,c,l)=>a.setFloat32(c,l,!0);break;default:ae(o),p(!1)}}getDecodeQueueSize(){return 0}decode(e){let r=L(e.data),i=e.byteLength/this.decoderConfig.numberOfChannels/this.inputSampleSize,s=i*this.decoderConfig.numberOfChannels*this.outputSampleSize,o=new ArrayBuffer(s),n=new DataView(o);for(let u=0;u<i*this.decoderConfig.numberOfChannels;u++){let d=u*this.inputSampleSize,f=u*this.outputSampleSize,h=this.readInputValue(r,d);this.writeOutputValue(n,f,h)}let a=i/this.decoderConfig.sampleRate;(this.currentTimestamp===null||Math.abs(e.timestamp-this.currentTimestamp)>=a)&&(this.currentTimestamp=e.timestamp);let c=this.currentTimestamp;this.currentTimestamp+=a;let l=new fe({format:this.outputFormat,data:o,numberOfChannels:this.decoderConfig.numberOfChannels,sampleRate:this.decoderConfig.sampleRate,numberOfFrames:i,timestamp:c});this.onSample(l)}async flush(){}close(){}},si=class extends ni{constructor(e){if(!(e instanceof Ct))throw new TypeError("audioTrack must be an InputAudioTrack.");super(),this._track=e}async _createDecoder(e,r){if(!await this._track.canDecode())throw new Error("This audio track cannot be decoded by this browser. Make sure to check decodability before using a track.");let i=await this._track.getCodec(),s=await this._track.getDecoderConfig();return p(i&&s),te.includes(s.codec)?new cn(e,r,s):new an(e,r,i,s)}_createPacketSink(){return new Ye(this._track)}async getSample(e,r={}){St(e);for await(let i of this.mediaSamplesAtTimestamps([e],r))return i;throw new Error("Internal error: Iterator returned nothing.")}samples(e,r,i={}){return this.mediaSamplesInRange(e,r,i)}samplesAtTimestamps(e,r={}){return this.mediaSamplesAtTimestamps(e,r)}};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var qt=class t{constructor(e,r){this.input=e,this._backing=r}isVideoTrack(){return this instanceof kt}isAudioTrack(){return this instanceof Ct}get id(){return this._backing.getId()}get number(){return this._backing.getNumber()}async getInternalCodecId(){return this._backing.getInternalCodecId()}get internalCodecId(){return Z(this._backing.getInternalCodecId(),"internalCodecId","getInternalCodecId")}async getLanguageCode(){return this._backing.getLanguageCode()}get languageCode(){return Z(this._backing.getLanguageCode(),"languageCode","getLanguageCode")}async getName(){return this._backing.getName()}get name(){return Z(this._backing.getName(),"name","getName")}async getTimeResolution(){return this._backing.getTimeResolution()}get timeResolution(){return Z(this._backing.getTimeResolution(),"timeResolution","getTimeResolution")}async isRelativeToUnixEpoch(){return this._backing.isRelativeToUnixEpoch()}async getUnixTimeForTimestamp(e){return this._backing.getUnixTimeForTimestamp(e)}async hasUnixTimeMapping(){return await this._backing.getUnixTimeForTimestamp(await this.getFirstTimestamp())!==null}async getDisposition(){return this._backing.getDisposition()}get disposition(){return Z(this._backing.getDisposition(),"disposition","getDisposition")}async getBitrate(){return this._backing.getBitrate()}async getAverageBitrate(){return this._backing.getAverageBitrate()}async getFirstTimestamp(){return(await this._backing.getFirstPacket({metadataOnly:!0}))?.timestamp??0}async computeDuration(e){let r=await this._backing.getPacket(1/0,{metadataOnly:!0,...e}),i=(r?.timestamp??0)+(r?.duration??0);return sr(i,await this.getTimeResolution())}async getDurationFromMetadata(e={}){return this._backing.getDurationFromMetadata(e)}async computePacketStats(e=1/0,r){let i=new Ye(this),s=1/0,o=-1/0,n=0,a=0;for await(let c of i.packets(void 0,void 0,{metadataOnly:!0,...r})){if(n>=e&&c.timestamp>=o)break;s=Math.min(s,c.timestamp),o=Math.max(o,c.timestamp+c.duration),n++,a+=c.byteLength}return{packetCount:n,averagePacketRate:n?Number((n/(o-s)).toPrecision(16)):0,averageBitrate:n?Number((8*a/(o-s)).toPrecision(16)):0}}async isLive(){return await this._backing.getLiveRefreshInterval()!==null}async getLiveRefreshInterval(){return this._backing.getLiveRefreshInterval()}canBePairedWith(e){if(!(e instanceof t))throw new TypeError("other must be an InputTrack.");return this.input!==e.input||this===e?!1:(this._backing.getPairingMask()&e._backing.getPairingMask())!==0n}async getPairableTracks(e){return this.input.getTracks(ut({filter:r=>r.canBePairedWith(this)},e))}async getPairableVideoTracks(e){return this.input.getVideoTracks(ut({filter:r=>r.canBePairedWith(this)},e))}async getPairableAudioTracks(e){return this.input.getAudioTracks(ut({filter:r=>r.canBePairedWith(this)},e))}async getPrimaryPairableVideoTrack(e){return this.input.getPrimaryVideoTrack(ut({filter:r=>r.canBePairedWith(this)},e))}async getPrimaryPairableAudioTrack(e){return this.input.getPrimaryAudioTrack(ut({filter:r=>r.canBePairedWith(this)},e))}async hasPairableTrack(e){e&&=un(e);let r=await this.input.getTracks();for(let i of r)if(this.canBePairedWith(i)&&(!e||await e(i)))return!0;return!1}hasPairableVideoTrack(e){return e&&=un(e),this.hasPairableTrack(async r=>r.isVideoTrack()&&(!e||await e(r)))}hasPairableAudioTrack(e){return e&&=un(e),this.hasPairableTrack(async r=>r.isAudioTrack()&&(!e||await e(r)))}},Z=(t,e,r)=>{if(t instanceof Promise)throw new Error(`'${e}' is deprecated and not available synchronously for this track. Use the preferred '${r}()' instead.`);return t},un=t=>{if(t!==void 0&&typeof t!="function")throw new TypeError("predicate, when provided, must be a function.");return t?e=>{let r=s=>{if(typeof s!="boolean")throw new TypeError("predicate must return or resolve to a boolean value.");return s},i=t(e);return i instanceof Promise?i.then(r):r(i)}:void 0},kt=class extends qt{constructor(e,r){super(e,r),this._pixelAspectRatioCache=null,this._backing=r}get type(){return"video"}async getCodec(){return this._backing.getCodec()}get codec(){return Z(this._backing.getCodec(),"codec","getCodec")}async hasOnlyKeyPackets(){return await this._backing.getHasOnlyKeyPackets?.()??await this._backing.getCodec()==="prores"}async getCodedWidth(){return this._backing.getCodedWidth()}get codedWidth(){return Z(this._backing.getCodedWidth(),"codedWidth","getCodedWidth")}async getCodedHeight(){return this._backing.getCodedHeight()}get codedHeight(){return Z(this._backing.getCodedHeight(),"codedHeight","getCodedHeight")}async getRotation(){return this._backing.getRotation()}get rotation(){return Z(this._backing.getRotation(),"rotation","getRotation")}async getSquarePixelWidth(){return this._backing.getSquarePixelWidth()}get squarePixelWidth(){return Z(this._backing.getSquarePixelWidth(),"squarePixelWidth","getSquarePixelWidth")}async getSquarePixelHeight(){return this._backing.getSquarePixelHeight()}get squarePixelHeight(){return Z(this._backing.getSquarePixelHeight(),"squarePixelHeight","getSquarePixelHeight")}async getPixelAspectRatio(){return this._pixelAspectRatioCache??=gt({num:await this.getSquarePixelWidth()*await this.getCodedHeight(),den:await this.getSquarePixelHeight()*await this.getCodedWidth()})}get pixelAspectRatio(){return this._pixelAspectRatioCache??=gt({num:Z(this._backing.getSquarePixelWidth(),"pixelAspectRatio","getPixelAspectRatio")*Z(this._backing.getCodedHeight(),"pixelAspectRatio","getPixelAspectRatio"),den:Z(this._backing.getSquarePixelHeight(),"pixelAspectRatio","getPixelAspectRatio")*Z(this._backing.getCodedWidth(),"pixelAspectRatio","getPixelAspectRatio")})}async getDisplayWidth(){let e=await this._backing.getMetadataDisplayWidth?.();return e??(await this.getRotation()%180===0?this.getSquarePixelWidth():this.getSquarePixelHeight())}get displayWidth(){let e=this._backing.getMetadataDisplayWidth?.();if(e!==void 0){let s=Z(e,"displayWidth","getDisplayWidth");if(s!==null)return s}let i=Z(this._backing.getRotation(),"displayWidth","getDisplayWidth")%180===0?this._backing.getSquarePixelWidth():this._backing.getSquarePixelHeight();return Z(i,"displayWidth","getDisplayWidth")}async getDisplayHeight(){let e=await this._backing.getMetadataDisplayHeight?.();return e??(await this.getRotation()%180===0?this.getSquarePixelHeight():this.getSquarePixelWidth())}get displayHeight(){let e=this._backing.getMetadataDisplayHeight?.();if(e!==void 0){let s=Z(e,"displayHeight","getDisplayHeight");if(s!==null)return s}let i=Z(this._backing.getRotation(),"displayHeight","getDisplayHeight")%180===0?this._backing.getSquarePixelHeight():this._backing.getSquarePixelWidth();return Z(i,"displayHeight","getDisplayHeight")}async getColorSpace(){return this._backing.getColorSpace()}async hasHighDynamicRange(){let e=await this._backing.getColorSpace();return e.primaries==="bt2020"||e.primaries==="smpte432"||e.transfer==="pq"||e.transfer==="hlg"||e.matrix==="bt2020-ncl"}async canBeTransparent(){return this._backing.canBeTransparent()}async getDecoderConfig(){return this._backing.getDecoderConfig()}async getCodecParameterString(){let e=await this._backing.getMetadataCodecParameterString?.();return e??(await this._backing.getDecoderConfig())?.codec??null}async canDecode(){try{let e=await this._backing.getDecoderConfig();if(!e)return!1;let r=await this._backing.getCodec();return p(r!==null),ri.some(s=>s.supports(r,e))?!0:typeof VideoDecoder>"u"?!1:(await VideoDecoder.isConfigSupported(e)).supported===!0}catch(e){return M._error("Error during decodability check:",e),!1}}async determinePacketType(e){if(!(e instanceof ee))throw new TypeError("packet must be an EncodedPacket.");if(e.isMetadataOnly)throw new TypeError("packet must not be metadata-only to determine its type.");let r=await this.getCodec();if(r===null)return null;let i=await this.getDecoderConfig();return p(i),Vt(r,i,e.data)}},Ct=class extends qt{constructor(e,r){super(e,r),this._backing=r}get type(){return"audio"}async getCodec(){return this._backing.getCodec()}get codec(){return Z(this._backing.getCodec(),"codec","getCodec")}async hasOnlyKeyPackets(){return await this._backing.getHasOnlyKeyPackets?.()??!0}async getNumberOfChannels(){return this._backing.getNumberOfChannels()}get numberOfChannels(){return Z(this._backing.getNumberOfChannels(),"numberOfChannels","getNumberOfChannels")}async getSampleRate(){return this._backing.getSampleRate()}get sampleRate(){return Z(this._backing.getSampleRate(),"sampleRate","getSampleRate")}async getDecoderConfig(){return this._backing.getDecoderConfig()}async getCodecParameterString(){let e=await this._backing.getMetadataCodecParameterString?.();return e??(await this._backing.getDecoderConfig())?.codec??null}async canDecode(){try{let e=await this._backing.getDecoderConfig();if(!e)return!1;let r=await this._backing.getCodec();return p(r!==null),ii.some(i=>i.supports(r,e))||e.codec.startsWith("pcm-")?!0:typeof AudioDecoder>"u"?!1:(await AudioDecoder.isConfigSupported(e)).supported===!0}catch(e){return M._error("Error during decodability check:",e),!1}}async determinePacketType(e){if(!(e instanceof ee))throw new TypeError("packet must be an EncodedPacket.");return await this.getCodec()===null?null:"key"}};var ln=t=>-(t??-1/0),jt=t=>-t,Qt=t=>{if(typeof t!="object"||!t)throw new TypeError("query must be an object.");if(t.filter!==void 0&&typeof t.filter!="function")throw new TypeError("query.filter, when provided, must be a function.");if(t.sortBy!==void 0&&typeof t.sortBy!="function")throw new TypeError("query.sortBy, when provided, must be a function.");return{filter:t.filter?e=>{let r=s=>{if(typeof s!="boolean")throw new TypeError("query.filter must return or resolve to a boolean.");return s},i=t.filter(e);return i instanceof Promise?i.then(r):r(i)}:void 0,sortBy:t.sortBy?e=>{let r=s=>{if(typeof s!="number"&&(!Array.isArray(s)||!s.every(o=>typeof o=="number")))throw new TypeError("query.sortBy must return or resolve to a number or an array of numbers.");return s},i=t.sortBy(e);return i instanceof Promise?i.then(r):r(i)}:void 0}},ut=(t,e)=>({filter:t?.filter||e?.filter?r=>{let i=t?.filter?.(r)??!0,s=o=>o===!1?!1:e?.filter?.(r)??!0;return i instanceof Promise?i.then(s):s(i)}:void 0,sortBy:t?.sortBy||e?.sortBy?r=>{let i=t?.sortBy?.(r)??[],s=e?.sortBy?.(r)??[],o=(n,a)=>[...Array.isArray(n)?n:[n],...Array.isArray(a)?a:[a]];return i instanceof Promise||s instanceof Promise?Promise.all([i,s]).then(([n,a])=>o(n,a)):o(i,s)}:void 0}),oi=async(t,e)=>{let r=t;if(e?.filter){let n=t.map(c=>e.filter(c));if(n.some(c=>c instanceof Promise)){let c=await Promise.all(n);r=t.filter((l,u)=>c[u])}else r=t.filter((c,l)=>n[l])}if(!e?.sortBy)return r;let i=r.map(n=>e.sortBy(n)),o=i.some(n=>n instanceof Promise)?await Promise.all(i):i;return r.map((n,a)=>({track:n,sortValue:o[a]})).sort((n,a)=>{let c=Array.isArray(n.sortValue)?n.sortValue:[n.sortValue],l=Array.isArray(a.sortValue)?a.sortValue:[a.sortValue],u=Math.max(c.length,l.length);for(let d=0;d<u;d++){let f=c[d]??0,h=l[d]??0;if(f!==h)return f-h}return 0}).map(n=>n.track)};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */Mt();var Ea=1;var Et=class t extends be{get disposed(){return this._disposed}constructor(e){if(super(),this._demuxerPromise=null,this._format=null,this._trackBackingsCache=null,this._backingToTrack=new Map,this._disposed=!1,this._nextSourceCacheAge=0,this._sourceRefs=[],this._sourceCache=[],this._sourceCachePromises=[],this._onFormatDetermined=null,!e||typeof e!="object")throw new TypeError("options must be an object.");if(!Array.isArray(e.formats)||e.formats.some(r=>!(r instanceof Ht)))throw new TypeError("options.formats must be an array of InputFormat.");if(!(e.source instanceof Te||e.source instanceof bt))throw new TypeError("options.source must be a Source or SourceRef.");if(e.source instanceof Te&&e.source._disposed)throw new TypeError("options.source must not be a disposed Source.");if(e.initInput!==void 0&&!(e.initInput instanceof t))throw new TypeError("options.initInput, when provided, must be an Input.");e.formatOptions!==void 0&&Gs(e.formatOptions,"formatOptions"),this._formats=e.formats,this._initInput=e.initInput??null,this._formatOptions=e.formatOptions??{},e.source instanceof Te?this._rootRef=e.source.ref():this._rootRef=e.source,this._sourceRefs.push(this._rootRef)}get _rootSource(){return this._rootRef.source}async _getSourceUncached(e){p(this._rootSource instanceof mr);let r=await this._rootSource._resolveRequest(e);return this._emit("source",{source:r.source,request:e,isRoot:e.isRoot}),r}_getSourceCached(e,r=Ea){let i=this._sourceCache.find(n=>n.cacheGroup===r&&$i(n.request,e));if(i)return i.age++,Promise.resolve(i.sourceRef.source.ref());let s=this._sourceCachePromises.find(n=>n.cacheGroup===r&&$i(n.request,e));if(s)return s.promise.then(n=>n.sourceRef.source.ref());let o=(async()=>{let n=await this._getSourceUncached(e);if(Qn(this._sourceCache,d=>d.cacheGroup===r&&d.sourceRef.source._refCount===1)>=4){let d=Fr(this._sourceCache,h=>h.cacheGroup===r&&h.sourceRef.source._refCount===1?h.age:1/0);p(d!==-1);let f=this._sourceCache[d];this._sourceCache.splice(d,1),f.sourceRef.free(),tr(this._sourceRefs,f.sourceRef)}this._sourceRefs.push(n);let l=this._sourceCachePromises.findIndex(d=>d.request===e);return p(l!==-1),this._sourceCachePromises.splice(l,1),{request:e,sourceRef:n,age:this._nextSourceCacheAge++,cacheGroup:r}})();return this._sourceCachePromises.push({request:e,cacheGroup:r,promise:o}),o.then(n=>{let a=n.sourceRef.source.ref();return this._sourceCache.push(n),a})}_getDemuxer(){return this._demuxerPromise??=(async()=>{this._reader=new ai(this._rootSource),this._emit("source",{source:this._rootSource,request:null,isRoot:!0});for(let e of this._formats)if(await e._canReadInput(this))return this._format=e,this._onFormatDetermined?.(e),e._createDemuxer(this);throw new Sr})()}get source(){return this._rootSource}async getFormat(){return await this._getDemuxer(),p(this._format),this._format}async canRead(){try{return await this._getDemuxer(),!0}catch(e){if(e instanceof Sr)return!1;throw e}}async getFirstTimestamp(e){e??=await this.getTracks();let r=e.filter(s=>s!==null);if(r.length===0)return 0;let i=await Promise.all(r.map(s=>s.getFirstTimestamp()));return Math.min(...i)}async computeDuration(e,r){e??=await this.getTracks();let i=e.filter(o=>o!==null);if(i.length===0)return 0;let s=await Promise.all(i.map(o=>o.computeDuration(r)));return Math.max(...s)}async getDurationFromMetadata(e,r){e??=await this.getTracks();let i=e.filter(n=>n!==null),o=(await Promise.all(i.map(n=>n.getDurationFromMetadata(r)))).filter(n=>n!==null);return o.length===0?null:Math.max(...o)}async getTracks(e){e&&=Qt(e);let i=(await this._getTrackBackings()).map(s=>this._wrapBackingAsTrack(s));return oi(i,e)}async getVideoTracks(e){e&&=Qt(e);let i=(await this.getTracks()).filter(s=>s.isVideoTrack());return oi(i,e)}async getAudioTracks(e){e&&=Qt(e);let i=(await this.getTracks()).filter(s=>s.isAudioTrack());return oi(i,e)}async getPrimaryVideoTrack(e){e&&=Qt(e);let r=ut(e,{sortBy:async s=>[jt((await s.getDisposition()).default),jt(await s.hasPairableAudioTrack()),jt(!await s.hasOnlyKeyPackets()),ln(await s.getBitrate())]});return(await this.getVideoTracks(r))[0]??null}async getPrimaryAudioTrack(e){e&&=Qt(e);let r=await this.getPrimaryVideoTrack(),i=ut(e,{sortBy:async o=>[jt(!r||o.canBePairedWith(r)),jt((await o.getDisposition()).default),ln(await o.getBitrate())]});return(await this.getAudioTracks(i))[0]??null}async _getTrackBackings(){let e=await this._getDemuxer();return this._trackBackingsCache??=await e.getTrackBackings()}_wrapBackingAsTrack(e){let r=this._backingToTrack.get(e);if(r)return r;let s=e.getType()==="video"?new kt(this,e):new Ct(this,e);return this._backingToTrack.set(e,s),s}async getMimeType(){return(await this._getDemuxer()).getMimeType()}async getMetadataTags(){return(await this._getDemuxer()).getMetadataTags()}dispose(){if(!this._disposed){this._disposed=!0;for(let e of this._sourceRefs)e.free();this._sourceRefs.length=0,this._demuxerPromise&&this._demuxerPromise.then(e=>e.dispose()).catch(()=>{})}}[Symbol.dispose](){this.dispose()}},Sr=class extends Error{constructor(e="Input has an unsupported or unrecognizable format."){super(e),this.name="UnsupportedInputFormatError"}},oe=class extends Error{constructor(e="Input has been disposed."){super(e),this.name="InputDisposedError"}};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var ai=class{constructor(e){this.source=e}get fileSize(){let e=this.source._getFileSize();if(e===void 0)throw new Error("Reading file size too early; read required first.");return e}get fileSizeNonStrict(){return this.source._getFileSize()??null}requestSlice(e,r){if(this.source._disposed)throw new oe;if(e<0||this.fileSizeNonStrict!==null&&e+r>this.fileSizeNonStrict)return null;if(r===0){let o=new Uint8Array(0);return new Ze(o,L(o),0,e,e)}let i=e+r,s=this.source._read(e,i,Ki,Gi);return s instanceof Promise?s.then(o=>o?new Ze(o.bytes,o.view,o.offset,e,i):null):s?new Ze(s.bytes,s.view,s.offset,e,i):null}requestSliceRange(e,r,i){if(this.source._disposed)throw new oe;if(e<0)return null;if(this.fileSizeNonStrict!==null)return this.requestSlice(e,K(this.fileSizeNonStrict-e,r,i));{let s=this.requestSlice(e,i),o=n=>n||(p(this.fileSizeNonStrict!==null),this.requestSlice(e,K(this.fileSizeNonStrict-e,r,i)));return s instanceof Promise?s.then(o):o(s)}}requestEntireFile(){if(this.fileSizeNonStrict!==null)return this.requestSlice(0,this.fileSizeNonStrict);let e=1024;return(async()=>{let r=[],i=0;for(;;){if(r.length===1&&this.fileSizeNonStrict!==null)return this.requestSlice(0,this.fileSizeNonStrict);let n=this.requestSliceRange(i,0,e);if(n instanceof Promise&&(n=await n),!n||n.length===0)break;let a=q(n,n.length);r.push(a),i+=n.length}let s=new Uint8Array(i),o=0;for(let n of r)s.set(n,o),o+=n.length;return new Ze(s,L(s),0,0,i)})()}},Ze=class t{constructor(e,r,i,s,o){this.bytes=e,this.view=r,this.offset=i,this.start=s,this.end=o,this.bufferPos=s-i}static tempFromBytes(e){return new t(e,L(e),0,0,e.length)}get length(){return this.end-this.start}get filePos(){return this.offset+this.bufferPos}set filePos(e){this.bufferPos=e-this.offset}get remainingLength(){return Math.max(this.end-this.filePos,0)}skip(e){this.bufferPos+=e}slice(e,r=this.end-e){if(e<this.start||e+r>this.end)throw new RangeError("Slicing outside of original slice.");return new t(this.bytes,this.view,this.offset,e,e+r)}},Je=(t,e)=>{if(t.filePos<t.start||t.filePos+e>t.end)throw new RangeError(`Tried reading [${t.filePos}, ${t.filePos+e}), but slice is [${t.start}, ${t.end}). This is likely an internal error, please report it alongside the file that caused it.`)},q=(t,e)=>{Je(t,e);let r=t.bytes.subarray(t.bufferPos,t.bufferPos+e);return t.bufferPos+=e,r},D=t=>(Je(t,1),t.view.getUint8(t.bufferPos++));var se=t=>{Je(t,2);let e=t.view.getUint16(t.bufferPos,!1);return t.bufferPos+=2,e},$e=t=>{Je(t,3);let e=mt(t.view,t.bufferPos,!1);return t.bufferPos+=3,e},Hs=t=>{Je(t,2);let e=t.view.getInt16(t.bufferPos,!1);return t.bufferPos+=2,e};var E=t=>{Je(t,4);let e=t.view.getUint32(t.bufferPos,!1);return t.bufferPos+=4,e};var Ke=t=>{Je(t,4);let e=t.view.getInt32(t.bufferPos,!1);return t.bufferPos+=4,e};var pe=t=>{let e=E(t),r=E(t);return e*4294967296+r},qs=t=>{let e=Ke(t),r=E(t);return e*4294967296+r};var js=t=>{Je(t,8);let e=t.view.getFloat64(t.bufferPos,!1);return t.bufferPos+=8,e},ge=(t,e)=>{Je(t,e);let r="";for(let i=0;i<e;i++)r+=String.fromCharCode(t.bytes[t.bufferPos++]);return r};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var ci=class{constructor(e){this.mutex=new Rt,this.trackTimestampInfo=new WeakMap,this.output=e}onTrackClose(e){}validateTimestamp(e,r,i){if(r<0)throw new Error(`Timestamps must be non-negative (got ${r}s).`);let s=this.trackTimestampInfo.get(e);if(s){if(i&&(s.maxTimestampBeforeLastKeyPacket=s.maxTimestamp),s.maxTimestampBeforeLastKeyPacket!==null&&r<s.maxTimestampBeforeLastKeyPacket)throw new Error(`Timestamps cannot be smaller than the largest timestamp of the previous GOP (a GOP begins with a key packet and ends right before the next key packet). Got ${r}s, but largest timestamp is ${s.maxTimestampBeforeLastKeyPacket}s.`);s.maxTimestamp=Math.max(s.maxTimestamp,r)}else{if(!i)throw new Error("First packet must be a key packet.");s={maxTimestamp:r,maxTimestampBeforeLastKeyPacket:null},this.trackTimestampInfo.set(e,s)}}};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var dn=/<(?:(\d{2}):)?(\d{2}):(\d{2}).(\d{3})>/g;var wo=t=>{let e=Math.floor(t/36e5),r=Math.floor(t%(3600*1e3)/(60*1e3)),i=Math.floor(t%(60*1e3)/1e3),s=t%1e3;return e.toString().padStart(2,"0")+":"+r.toString().padStart(2,"0")+":"+i.toString().padStart(2,"0")+"."+s.toString().padStart(3,"0")};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var vt=class{constructor(e){this.writer=e,this.helper=new Uint8Array(8),this.helperView=new DataView(this.helper.buffer),this.offsets=new WeakMap}writeU32(e){this.helperView.setUint32(0,e,!1),this.writer.write(this.helper.subarray(0,4))}writeU64(e){this.helperView.setUint32(0,Math.floor(e/2**32),!1),this.helperView.setUint32(4,e,!1),this.writer.write(this.helper.subarray(0,8))}writeAscii(e){for(let r=0;r<e.length;r++)this.helperView.setUint8(r%8,e.charCodeAt(r)),r%8===7&&this.writer.write(this.helper);e.length%8!==0&&this.writer.write(this.helper.subarray(0,e.length%8))}writeBox(e){if(this.offsets.set(e,this.writer.getPos()),e.contents&&!e.children)this.writeBoxHeader(e,e.size??e.contents.byteLength+8),this.writer.write(e.contents);else{let r=this.writer.getPos();if(this.writeBoxHeader(e,0),e.contents&&this.writer.write(e.contents),e.children)for(let o of e.children)o&&this.writeBox(o);let i=this.writer.getPos(),s=e.size??i-r;this.writer.seek(r),this.writeBoxHeader(e,s),this.writer.seek(i)}}writeBoxHeader(e,r){this.writeU32(e.largeSize?1:r),this.writeAscii(e.type),e.largeSize&&this.writeU64(r)}measureBoxHeader(e){return 8+(e.largeSize?8:0)}patchBox(e){let r=this.offsets.get(e);p(r!==void 0);let i=this.writer.getPos();this.writer.seek(r),this.writeBox(e),this.writer.seek(i)}measureBox(e){if(e.contents&&!e.children)return this.measureBoxHeader(e)+e.contents.byteLength;{let r=this.measureBoxHeader(e);if(e.contents&&(r+=e.contents.byteLength),e.children)for(let i of e.children)i&&(r+=this.measureBox(i));return r}}},O=new Uint8Array(8),Se=new DataView(O.buffer),re=t=>[(t%256+256)%256],R=t=>(Se.setUint16(0,t,!1),[O[0],O[1]]),pn=t=>(Se.setInt16(0,t,!1),[O[0],O[1]]),Ao=t=>(Se.setUint32(0,t,!1),[O[1],O[2],O[3]]),x=t=>(Se.setUint32(0,t,!1),[O[0],O[1],O[2],O[3]]),et=t=>(Se.setInt32(0,t,!1),[O[0],O[1],O[2],O[3]]),Ve=t=>(Se.setUint32(0,Math.floor(t/2**32),!1),Se.setUint32(4,t,!1),[O[0],O[1],O[2],O[3],O[4],O[5],O[6],O[7]]),va=t=>(Se.setInt32(0,Math.floor(t/2**32),!1),Se.setUint32(4,t,!1),[O[0],O[1],O[2],O[3],O[4],O[5],O[6],O[7]]),To=t=>(Se.setInt16(0,2**8*t,!1),[O[0],O[1]]),Be=t=>(Se.setInt32(0,2**16*t,!1),[O[0],O[1],O[2],O[3]]),fn=t=>(Se.setInt32(0,2**30*t,!1),[O[0],O[1],O[2],O[3]]),hn=(t,e)=>{let r=[],i=t;do{let s=i&127;i>>=7,r.length>0&&(s|=128),r.push(s),e!==void 0&&e--}while(i>0||e);return r.reverse()},N=(t,e=!1)=>{let r=Array(t.length).fill(null).map((i,s)=>t.charCodeAt(s));return e&&r.push(0),r},xo=t=>{let e=t*(Math.PI/180),r=Math.round(Math.cos(e)),i=Math.round(Math.sin(e));return[r,i,0,-i,r,0,0,0,1]},_o=xo(0),So=t=>[Be(t[0]),Be(t[1]),fn(t[2]),Be(t[3]),Be(t[4]),fn(t[5]),Be(t[6]),Be(t[7]),fn(t[8])],P=(t,e,r)=>({type:t,contents:e&&new Uint8Array(e.flat(10)),children:r}),V=(t,e,r,i,s)=>P(t,[re(e),Ao(r),i??[]],s),ko=t=>t.isQuickTime?P("ftyp",[N("qt  "),x(512),N("qt  ")]):t.fragmented?t.cmaf?P("ftyp",[N("iso5"),x(512),N("iso5"),N("iso6"),N("mp41"),N("cmfc"),N("dash")]):P("ftyp",[N("iso5"),x(512),N("iso5"),N("iso6"),N("mp41")]):P("ftyp",[N("isom"),x(512),N("isom"),t.holdsAvc?N("avc1"):[],N("mp41")]),gn=()=>P("styp",[N("iso5"),x(0),N("iso5"),N("iso6"),N("mp41"),N("cmfc"),N("dash")]),wn=(t,e)=>{let r=t.maxWrittenEndTimestamp-t.minWrittenTimestamp;return Number.isFinite(r)||(r=0),V("sidx",1,0,[x(1),x(_e),Ve(G(t.minWrittenTimestamp,_e)),Ve(0),R(0),R(1),x(e&2147483647),x(G(r,_e)),x(0)])},kr=t=>({type:"mdat",largeSize:t}),Co=t=>({type:"free",size:t}),Kt=t=>P("moov",void 0,[Ia(t.creationTime,t.trackDatas),...t.trackDatas.map(e=>Pa(e,t.creationTime)),t.isFragmented?pc(t.trackDatas):null,Sc(t)]),Ia=(t,e)=>{let r=Math.max(0,...e.map(n=>G(ui(n),_e)+G(n.startTimestampOffset??0,_e))),i=Math.max(0,...e.map(n=>n.track.id))+1,s=!Le(t)||!Le(r),o=s?Ve:x;return V("mvhd",+s,0,[o(t),o(t),x(_e),o(r),Be(1),To(1),Array(10).fill(0),So(_o),Array(24).fill(0),x(i)])},ui=t=>{if(t.samples.length===0)return 0;let e=1/0,r=-1/0;for(let i=0;i<t.samples.length;i++){let s=t.samples[i];s.timestamp<e&&(e=s.timestamp),s.timestamp+s.duration>r&&(r=s.timestamp+s.duration)}return e===1/0?0:r-e},Pa=(t,e)=>{let r=zo(t),i=t.startTimestampOffset!==null&&t.startTimestampOffset>0;return P("trak",void 0,[Ba(t,e),i?Ra(t,t.startTimestampOffset):null,Fa(t,e),r.name!==void 0?P("udta",void 0,[P("name",[...Ae.encode(r.name)])]):null])},Ba=(t,e)=>{let r=G(ui(t),_e)+G(t.startTimestampOffset??0,_e),i=!Le(e)||!Le(r),s=i?Ve:x,o;if(t.type==="video"){let a=t.track.metadata.rotation;o=xo(a??0)}else o=_o;let n=2;return t.track.metadata.disposition?.default!==!1&&(n|=1),V("tkhd",+i,n,[s(e),s(e),x(t.track.id),x(0),s(r),Array(8).fill(0),R(0),R(t.track.id),To(t.type==="audio"?1:0),R(0),So(o),Be(t.type==="video"?t.info.width:0),Be(t.type==="video"?t.info.height:0)])},Ra=(t,e)=>{let r=G(e,_e),i=G(ui(t),_e),s=!Le(r)||!Le(i),o=s?Ve:x,n=s?va:et;return P("edts",void 0,[V("elst",s?1:0,0,[x(2),o(r),n(-1),Be(1),o(i),n(0),Be(1)])])},Fa=(t,e)=>P("mdia",void 0,[Ma(t,e),yn(!0,za[t.type],Oa[t.type]),Da(t)]),Ma=(t,e)=>{let r=G(ui(t),t.timescale),i=!Le(e)||!Le(r),s=i?Ve:x;return V("mdhd",+i,0,[s(e),s(e),x(t.timescale),s(r),R(Mo(t.track.metadata.languageCode??ir)),R(0)])},za={video:"vide",audio:"soun",subtitle:"text"},Oa={video:"MediabunnyVideoHandler",audio:"MediabunnySoundHandler",subtitle:"MediabunnyTextHandler"},yn=(t,e,r,i="\0\0\0\0")=>V("hdlr",0,0,[t?N("mhlr"):x(0),N(e),N(i),x(0),x(0),N(r,!0)]),Da=t=>P("minf",void 0,[Wa[t.type](),Na(),ja(t)]),Va=()=>V("vmhd",0,1,[R(0),R(0),R(0),R(0)]),Ua=()=>V("smhd",0,0,[R(0),R(0)]),La=()=>V("nmhd",0,0),Wa={video:Va,audio:Ua,subtitle:La},Na=()=>P("dinf",void 0,[Ha()]),Ha=()=>V("dref",0,0,[x(1)],[qa()]),qa=()=>V("url ",0,1),ja=t=>{let e=t.compositionTimeOffsetTable.length>1||t.compositionTimeOffsetTable.some(r=>r.sampleCompositionTimeOffset!==0);return P("stbl",void 0,[Qa(t),cc(t),e?hc(t):null,e?mc(t):null,lc(t),dc(t),fc(t),uc(t)])},Qa=t=>{let e;if(t.type==="video")e=Ka(vc(t.track.source._codec,t.info.decoderConfig.codec),t);else if(t.type==="audio"){let r=Fo(t.track.source._codec,t.muxer.isQuickTime);p(r),e=Ja(r,t)}else t.type==="subtitle"&&(e=oc(Bc[t.track.source._codec],t));return p(e),V("stsd",0,0,[x(1)],[e])},Ka=(t,e)=>P(t,[Array(6).fill(0),R(1),R(0),R(0),Array(12).fill(0),R(e.info.width),R(e.info.height),x(4718592),x(4718592),x(0),R(1),Array(32).fill(0),R(24),pn(65535)],[Ic[e.track.source._codec]?.(e)??null,Ga(e),Mn(e.info.decoderConfig.colorSpace)?$a(e):null]),Ga=t=>t.info.pixelAspectRatio.num===t.info.pixelAspectRatio.den?null:P("pasp",[x(t.info.pixelAspectRatio.num),x(t.info.pixelAspectRatio.den)]),$a=t=>P("colr",[N(t.muxer.isQuickTime?"nclc":"nclx"),R(We[t.info.decoderConfig.colorSpace.primaries]),R(Ne[t.info.decoderConfig.colorSpace.transfer]),R(He[t.info.decoderConfig.colorSpace.matrix]),t.muxer.isQuickTime?[]:re((t.info.decoderConfig.colorSpace.fullRange?1:0)<<7)]),Xa=t=>t.info.decoderConfig&&P("avcC",[...ie(t.info.decoderConfig.description)]),Ya=t=>t.info.decoderConfig&&P("hvcC",[...ie(t.info.decoderConfig.description)]),yo=t=>{if(!t.info.decoderConfig)return null;let e=t.info.decoderConfig,r=e.codec.split("."),i=Number(r[1]),s=Number(r[2]),o=Number(r[3]),n=r[4]?Number(r[4]):1,a=r[8]?Number(r[8]):Number(e.colorSpace?.fullRange??0),c=(o<<4)+(n<<1)+a,l=r[5]?Number(r[5]):e.colorSpace?.primaries?We[e.colorSpace.primaries]:2,u=r[6]?Number(r[6]):e.colorSpace?.transfer?Ne[e.colorSpace.transfer]:2,d=r[7]?Number(r[7]):e.colorSpace?.matrix?He[e.colorSpace.matrix]:2;return V("vpcC",1,0,[re(i),re(s),re(c),re(l),re(u),re(d),R(0)])},Za=t=>P("av1C",ts(t.info.decoderConfig.codec)),Ja=(t,e)=>{let r=0,i,s=16,o=te.includes(e.track.source._codec);if(o){let n=e.track.source._codec,{sampleSize:a}=me(n);s=8*a,s>16&&(r=1)}if(e.muxer.isQuickTime&&(r=1),r===0)i=[Array(6).fill(0),R(1),R(r),R(0),x(0),R(e.info.numberOfChannels),R(s),R(0),R(0),R(e.info.sampleRate<2**16?e.info.sampleRate:0),R(0)];else{let n=o?0:-2;i=[Array(6).fill(0),R(1),R(r),R(0),x(0),R(e.info.numberOfChannels),R(Math.min(s,16)),pn(n),R(0),R(e.info.sampleRate<2**16?e.info.sampleRate:0),R(0),o?[x(1),x(s/8),x(e.info.numberOfChannels*s/8)]:[x(0),x(0),x(0)],x(2)]}return P(t,i,[Pc(e.track.source._codec,e.muxer.isQuickTime)?.(e)??null])},mn=t=>{let e;switch(t.track.source._codec){case"aac":e=64;break;case"mp3":e=107;break;case"vorbis":e=221;break;default:throw new Error(`Unhandled audio codec: ${t.track.source._codec}`)}let r=[...re(e),...re(21),...Ao(0),...x(0),...x(0)];if(t.info.decoderConfig.description){let i=ie(t.info.decoderConfig.description);r=[...r,...re(5),...hn(i.byteLength),...i]}return r=[...R(1),...re(0),...re(4),...hn(r.length),...r,...re(6),...re(1),...re(2)],r=[...re(3),...hn(r.length),...r],V("esds",0,0,r)},lt=t=>P("wave",void 0,[ec(t),tc(t),P("\0\0\0\0")]),ec=t=>P("frma",[N(Fo(t.track.source._codec,t.muxer.isQuickTime))]),tc=t=>{let{littleEndian:e}=me(t.track.source._codec);return P("enda",[R(+e)])},rc=t=>{let e=t.info.numberOfChannels,r=3840,i=t.info.sampleRate,s=0,o=0,n=new Uint8Array(0),a=t.info.decoderConfig?.description;if(a){p(a.byteLength>=18);let c=ie(a),l=Es(c);e=l.outputChannelCount,r=l.preSkip,i=l.inputSampleRate,s=l.outputGain,o=l.channelMappingFamily,l.channelMappingTable&&(n=l.channelMappingTable)}return P("dOps",[re(0),re(e),R(r),x(i),pn(s),re(o),...n])},ic=t=>{let e=t.info.decoderConfig?.description;p(e);let r=ie(e);return V("dfLa",0,0,[...r.subarray(4)])},Oe=t=>{let{littleEndian:e,sampleSize:r}=me(t.track.source._codec),i=+e;return V("pcmC",0,0,[re(i),re(8*r)])},nc=t=>{let e=vs(t.info.firstPacket.data);if(!e)throw new Error("Couldn't extract AC-3 frame info from the audio packet. Ensure the packets contain valid AC-3 sync frames (as specified in ETSI TS 102 366).");let r=new Uint8Array(3),i=new H(r);return i.writeBits(2,e.fscod),i.writeBits(5,e.bsid),i.writeBits(3,e.bsmod),i.writeBits(3,e.acmod),i.writeBits(1,e.lfeon),i.writeBits(5,e.bitRateCode),i.writeBits(5,0),P("dac3",[...r])},sc=t=>{let e=Is(t.info.firstPacket.data);if(!e)throw new Error("Couldn't extract E-AC-3 frame info from the audio packet. Ensure the packets contain valid E-AC-3 sync frames (as specified in ETSI TS 102 366).");let r=16;for(let n of e.substreams)r+=23,n.numDepSub>0?r+=9:r+=1;let i=Math.ceil(r/8),s=new Uint8Array(i),o=new H(s);o.writeBits(13,e.dataRate),o.writeBits(3,e.substreams.length-1);for(let n of e.substreams)o.writeBits(2,n.fscod),o.writeBits(5,n.bsid),o.writeBits(1,0),o.writeBits(1,0),o.writeBits(3,n.bsmod),o.writeBits(3,n.acmod),o.writeBits(1,n.lfeon),o.writeBits(3,0),o.writeBits(4,n.numDepSub),n.numDepSub>0?o.writeBits(9,n.chanLoc):o.writeBits(1,0);return P("dec3",[...s])},oc=(t,e)=>P(t,[Array(6).fill(0),R(1)],[Rc[e.track.source._codec](e)]),ac=t=>P("vttC",[...Ae.encode(t.info.config.description)]);var cc=t=>V("stts",0,0,[x(t.timeToSampleTable.length),t.timeToSampleTable.map(e=>[x(e.sampleCount),x(e.sampleDelta)])]),uc=t=>{if(t.samples.every(r=>r.type==="key"))return null;let e=[...t.samples.entries()].filter(([,r])=>r.type==="key");return V("stss",0,0,[x(e.length),e.map(([r])=>x(r+1))])},lc=t=>V("stsc",0,0,[x(t.compactlyCodedChunkTable.length),t.compactlyCodedChunkTable.map(e=>[x(e.firstChunk),x(e.samplesPerChunk),x(1)])]),dc=t=>{if(t.type==="audio"&&t.info.requiresPcmTransformation){let{sampleSize:e}=me(t.track.source._codec);return V("stsz",0,0,[x(e*t.info.numberOfChannels),x(t.samples.reduce((r,i)=>r+G(i.duration,t.timescale),0))])}return V("stsz",0,0,[x(0),x(t.samples.length),t.samples.map(e=>x(e.size))])},fc=t=>t.finalizedChunks.length>0&&X(t.finalizedChunks).offset>=2**32?V("co64",0,0,[x(t.finalizedChunks.length),t.finalizedChunks.map(e=>Ve(e.offset))]):V("stco",0,0,[x(t.finalizedChunks.length),t.finalizedChunks.map(e=>x(e.offset))]),hc=t=>V("ctts",1,0,[x(t.compositionTimeOffsetTable.length),t.compositionTimeOffsetTable.map(e=>[x(e.sampleCount),et(e.sampleCompositionTimeOffset)])]),mc=t=>{let e=1/0,r=-1/0,i=1/0,s=-1/0;p(t.compositionTimeOffsetTable.length>0),p(t.samples.length>0);for(let n=0;n<t.compositionTimeOffsetTable.length;n++){let a=t.compositionTimeOffsetTable[n];e=Math.min(e,a.sampleCompositionTimeOffset),r=Math.max(r,a.sampleCompositionTimeOffset)}for(let n=0;n<t.samples.length;n++){let a=t.samples[n];i=Math.min(i,G(a.timestamp,t.timescale)),s=Math.max(s,G(a.timestamp+a.duration,t.timescale))}let o=Math.max(-e,0);return s>=2**31?null:V("cslg",0,0,[et(o),et(e),et(r),et(i),et(s)])},pc=t=>P("mvex",void 0,t.map(gc)),gc=t=>V("trex",0,0,[x(t.track.id),x(1),x(0),x(0),x(0)]),bn=(t,e)=>P("moof",void 0,[wc(t),...e.map(yc)]),wc=t=>V("mfhd",0,0,[x(t)]),Eo=t=>{let e=0,r=0,i=0,s=0,o=t.type==="delta";return r|=+o,o?e|=1:e|=2,e<<24|r<<16|i<<8|s},yc=t=>P("traf",void 0,[bc(t),Ac(t),Tc(t)]),bc=t=>{p(t.currentChunk);let e=0;e|=8,e|=16,e|=32,e|=131072;let r=t.currentChunk.samples[1]??t.currentChunk.samples[0],i={duration:r.timescaleUnitsToNextSample,size:r.size,flags:Eo(r)};return V("tfhd",0,e,[x(t.track.id),x(i.duration),x(i.size),x(i.flags)])},Ac=t=>(p(t.currentChunk),V("tfdt",1,0,[Ve(G(t.currentChunk.startTimestamp,t.timescale))])),Tc=t=>{p(t.currentChunk);let e=t.currentChunk.samples.map(g=>g.timescaleUnitsToNextSample),r=t.currentChunk.samples.map(g=>g.size),i=t.currentChunk.samples.map(Eo),s=t.currentChunk.samples.map(g=>G(g.timestamp-g.decodeTimestamp,t.timescale)),o=new Set(e),n=new Set(r),a=new Set(i),c=new Set(s),l=a.size===2&&i[0]!==i[1],u=o.size>1,d=n.size>1,f=!l&&a.size>1,h=c.size>1||[...c].some(g=>g!==0),m=0;return m|=1,m|=4*+l,m|=256*+u,m|=512*+d,m|=1024*+f,m|=2048*+h,V("trun",1,m,[x(t.currentChunk.samples.length),x(t.currentChunk.offset-t.currentChunk.moofOffset||0),l?x(i[0]):[],t.currentChunk.samples.map((g,w)=>[u?x(e[w]):[],d?x(r[w]):[],f?x(i[w]):[],h?et(s[w]):[]])])},vo=t=>P("mfra",void 0,[...t.map(xc),_c()]),xc=(t,e)=>V("tfra",1,0,[x(t.track.id),x(63),x(t.finalizedChunks.length),t.finalizedChunks.map(i=>[Ve(G(i.samples[0].timestamp,t.timescale)),Ve(i.moofOffset),x(e+1),x(1),x(1)])]),_c=()=>V("mfro",0,0,[x(0)]),Io=()=>P("vtte"),Po=(t,e,r,i,s)=>P("vttc",void 0,[s!==null?P("vsid",[et(s)]):null,r!==null?P("iden",[...Ae.encode(r)]):null,e!==null?P("ctim",[...Ae.encode(wo(e))]):null,i!==null?P("sttg",[...Ae.encode(i)]):null,P("payl",[...Ae.encode(t)])]),Bo=t=>P("vtta",[...Ae.encode(t)]),Sc=t=>{let e=[],r=t.format._options.metadataFormat??"auto",i=t.output._metadataTags;if(r==="mdir"||r==="auto"&&!t.isQuickTime){let s=Cc(i);s&&e.push(s)}else if(r==="mdta"){let s=Ec(i);s&&e.push(s)}else(r==="udta"||r==="auto"&&t.isQuickTime)&&kc(e,t.output._metadataTags);return e.length===0?null:P("udta",void 0,e)},kc=(t,e)=>{for(let{key:r,value:i}of Br(e))switch(r){case"title":t.push(De("\xA9nam",i));break;case"description":t.push(De("\xA9des",i));break;case"artist":t.push(De("\xA9ART",i));break;case"album":t.push(De("\xA9alb",i));break;case"albumArtist":t.push(De("albr",i));break;case"genre":t.push(De("\xA9gen",i));break;case"date":t.push(De("\xA9day",i.toISOString().slice(0,10)));break;case"comment":t.push(De("\xA9cmt",i));break;case"lyrics":t.push(De("\xA9lyr",i));break;case"raw":break;case"discNumber":case"discsTotal":case"trackNumber":case"tracksTotal":case"images":break;default:ae(r)}if(e.raw)for(let r in e.raw){let i=e.raw[r];i==null||r.length!==4||t.some(s=>s.type===r)||(typeof i=="string"?t.push(De(r,i)):i instanceof Uint8Array&&t.push(P(r,Array.from(i))))}},De=(t,e)=>{let r=Ae.encode(e);return P(t,[R(r.length),R(Mo("und")),Array.from(r)])},bo={"image/jpeg":13,"image/png":14,"image/bmp":27},Ro=(t,e)=>{let r=[];for(let{key:i,value:s}of Br(t))switch(i){case"title":r.push({key:e?"title":"\xA9nam",value:Pe(s)});break;case"description":r.push({key:e?"description":"\xA9des",value:Pe(s)});break;case"artist":r.push({key:e?"artist":"\xA9ART",value:Pe(s)});break;case"album":r.push({key:e?"album":"\xA9alb",value:Pe(s)});break;case"albumArtist":r.push({key:e?"album_artist":"aART",value:Pe(s)});break;case"comment":r.push({key:e?"comment":"\xA9cmt",value:Pe(s)});break;case"genre":r.push({key:e?"genre":"\xA9gen",value:Pe(s)});break;case"lyrics":r.push({key:e?"lyrics":"\xA9lyr",value:Pe(s)});break;case"date":r.push({key:e?"date":"\xA9day",value:Pe(s.toISOString().slice(0,10))});break;case"images":for(let o of s)o.kind==="coverFront"&&r.push({key:"covr",value:P("data",[x(bo[o.mimeType]??0),x(0),Array.from(o.data)])});break;case"trackNumber":if(e){let o=t.tracksTotal!==void 0?`${s}/${t.tracksTotal}`:s.toString();r.push({key:"track",value:Pe(o)})}else r.push({key:"trkn",value:P("data",[x(0),x(0),R(0),R(s),R(t.tracksTotal??0),R(0)])});break;case"discNumber":e||r.push({key:"disc",value:P("data",[x(0),x(0),R(0),R(s),R(t.discsTotal??0),R(0)])});break;case"tracksTotal":case"discsTotal":break;case"raw":break;default:ae(i)}if(t.raw)for(let i in t.raw){let s=t.raw[i];s==null||!e&&i.length!==4||r.some(o=>o.key===i)||(typeof s=="string"?r.push({key:i,value:Pe(s)}):s instanceof Uint8Array?r.push({key:i,value:P("data",[x(0),x(0),Array.from(s)])}):s instanceof ke&&r.push({key:i,value:P("data",[x(bo[s.mimeType]??0),x(0),Array.from(s.data)])}))}return r},Cc=t=>{let e=Ro(t,!1);return e.length===0?null:V("meta",0,0,void 0,[yn(!1,"mdir","","appl"),P("ilst",void 0,e.map(r=>P(r.key,void 0,[r.value])))])},Ec=t=>{let e=Ro(t,!0);return e.length===0?null:P("meta",void 0,[yn(!1,"mdta",""),V("keys",0,0,[x(e.length)],e.map(r=>P("mdta",[...Ae.encode(r.key)]))),P("ilst",void 0,e.map((r,i)=>{let s=String.fromCharCode(...x(i+1));return P(s,void 0,[r.value])}))])},Pe=t=>P("data",[x(1),x(0),...Ae.encode(t)]),vc=(t,e)=>{switch(t){case"avc":return e.startsWith("avc3")?"avc3":"avc1";case"hevc":return"hvc1";case"vp8":return"vp08";case"vp9":return"vp09";case"av1":return"av01";case"prores":return e}},Ic={avc:Xa,hevc:Ya,vp8:yo,vp9:yo,av1:Za,prores:null},Fo=(t,e)=>{switch(t){case"aac":return"mp4a";case"mp3":return"mp4a";case"opus":return"Opus";case"vorbis":return"mp4a";case"flac":return"fLaC";case"ulaw":return"ulaw";case"alaw":return"alaw";case"pcm-u8":return"raw ";case"pcm-s8":return"sowt";case"ac3":return"ac-3";case"eac3":return"ec-3"}if(e)switch(t){case"pcm-s16":return"sowt";case"pcm-s16be":return"twos";case"pcm-s24":return"in24";case"pcm-s24be":return"in24";case"pcm-s32":return"in32";case"pcm-s32be":return"in32";case"pcm-f32":return"fl32";case"pcm-f32be":return"fl32";case"pcm-f64":return"fl64";case"pcm-f64be":return"fl64"}else switch(t){case"pcm-s16":return"ipcm";case"pcm-s16be":return"ipcm";case"pcm-s24":return"ipcm";case"pcm-s24be":return"ipcm";case"pcm-s32":return"ipcm";case"pcm-s32be":return"ipcm";case"pcm-f32":return"fpcm";case"pcm-f32be":return"fpcm";case"pcm-f64":return"fpcm";case"pcm-f64be":return"fpcm"}},Pc=(t,e)=>{switch(t){case"aac":return mn;case"mp3":return mn;case"opus":return rc;case"vorbis":return mn;case"flac":return ic;case"ac3":return nc;case"eac3":return sc}if(e)switch(t){case"pcm-s24":return lt;case"pcm-s24be":return lt;case"pcm-s32":return lt;case"pcm-s32be":return lt;case"pcm-f32":return lt;case"pcm-f32be":return lt;case"pcm-f64":return lt;case"pcm-f64be":return lt}else switch(t){case"pcm-s16":return Oe;case"pcm-s16be":return Oe;case"pcm-s24":return Oe;case"pcm-s24be":return Oe;case"pcm-s32":return Oe;case"pcm-s32be":return Oe;case"pcm-f32":return Oe;case"pcm-f32be":return Oe;case"pcm-f64":return Oe;case"pcm-f64be":return Oe}return null},Bc={webvtt:"wvtt"},Rc={webvtt:ac},Mo=t=>{p(t.length===3);let e=0;for(let r=0;r<3;r++)e<<=5,e+=t.charCodeAt(r)-96;return e};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var It=class{constructor(e,r){if(this.finalized=!1,this.started=!1,this.pos=0,this.trackedWrites=null,this.trackedStart=-1,this.trackedEnd=-1,e._writerAcquired)throw new Error("Can't have multiple Writers for the same Target.");this.target=e,e._setMonotonicity(r),e._writerAcquired=!0}start(){p(!this.started),this.target._start(),this.started=!0}write(e){p(this.started&&!this.finalized),this.maybeTrackWrites(e),this.target._write(e,this.pos),this.pos+=e.byteLength}seek(e){this.pos=e}getPos(){return this.pos}async flush(){return p(this.started&&!this.finalized),this.target._flush()}async finalize(){p(this.started&&!this.finalized),await this.target._finalize(),this.finalized=!0}maybeTrackWrites(e){if(!this.trackedWrites)return;let r=this.getPos();if(r<this.trackedStart){if(r+e.byteLength<=this.trackedStart)return;e=e.subarray(this.trackedStart-r),r=0}let i=r+e.byteLength-this.trackedStart,s=this.trackedWrites.byteLength;for(;s<i;)s*=2;if(s!==this.trackedWrites.byteLength){let o=new Uint8Array(s);o.set(this.trackedWrites,0),this.trackedWrites=o}this.trackedWrites.set(e,r-this.trackedStart),this.trackedEnd=Math.max(this.trackedEnd,r+e.byteLength)}startTrackingWrites(){this.trackedWrites=new Uint8Array(2**10),this.trackedStart=this.getPos(),this.trackedEnd=this.trackedStart}stopTrackingWrites(){if(!this.trackedWrites)throw new Error("Internal error: Can't get tracked writes since nothing was tracked.");let r={data:this.trackedWrites.subarray(0,this.trackedEnd-this.trackedStart),start:this.trackedStart,end:this.trackedEnd};return this.trackedWrites=null,r}};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var we=class extends be{constructor(){super(...arguments),this._writerAcquired=!1,this._monotonicity=null,this.onwrite=null}_setMonotonicity(e){this._monotonicity!==!1&&(this._monotonicity=e)}_dispatchWrite(e,r){this.onwrite?.(e,r),this._emit("write",{start:e,end:r})}slice(e){if(!Number.isInteger(e)||e<0)throw new TypeError("offset must be a non-negative integer.");return new li(this,e)}},An=2**16,Tn=2**32,tt=class extends we{constructor(e={}){if(super(),this.buffer=null,this._maxPos=0,!e||typeof e!="object")throw new TypeError("BufferTarget options, when provided, must be an object.");if(e.onFinalize!==void 0&&typeof e.onFinalize!="function")throw new TypeError("options.onFinalize, when provided, must be a function.");if(this._options=e,this._supportsResize="resize"in new ArrayBuffer(0),this._supportsResize)try{this._buffer=new ArrayBuffer(An,{maxByteLength:Tn})}catch{this._buffer=new ArrayBuffer(An),this._supportsResize=!1}else this._buffer=new ArrayBuffer(An);this._bytes=new Uint8Array(this._buffer)}_ensureSize(e){let r=this._buffer.byteLength;for(;r<e;)r*=2;if(r!==this._buffer.byteLength){if(r>Tn)throw new Error(`ArrayBuffer exceeded maximum size of ${Tn} bytes. Please consider using another target.`);if(this._supportsResize)this._buffer.resize(r);else{let i=new ArrayBuffer(r),s=new Uint8Array(i);s.set(this._bytes,0),this._buffer=i,this._bytes=s}}}_start(){}_write(e,r){this._ensureSize(r+e.byteLength),this._bytes.set(e,r),this._maxPos=Math.max(this._maxPos,r+e.byteLength),this._dispatchWrite(r,r+e.byteLength)}async _flush(){}async _finalize(){this.buffer=this._buffer.slice(0,this._maxPos),this._options.onFinalize&&await this._options.onFinalize(this.buffer),this._emit("finalized")}async _close(){}_getSlice(e,r){return this._bytes.slice(e,r)}},Wl=2**24;var Cr=class extends we{_start(){}_write(e,r){this._dispatchWrite(r,r+e.byteLength)}async _flush(){}async _finalize(){this._emit("finalized")}async _close(){}},li=class extends we{constructor(e,r){super(),this._baseTarget=e,this._offset=r}_start(){}_write(e,r){this._baseTarget._write(e,this._offset+r),this._dispatchWrite(r,r+e.byteLength)}_flush(){return this._baseTarget._flush()}async _finalize(){this._emit("finalized")}async _close(){}_setMonotonicity(e){super._setMonotonicity(e),this._baseTarget._setMonotonicity(e)}},Pt=class{constructor(e,r){if(this.rootPath=e,this.getTarget=r,typeof e!="string")throw new TypeError("rootPath must be a string.");if(typeof r!="function")throw new TypeError("getTarget must be a function.")}};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var _e=57600,Fc=2082844800,zo=t=>{let e={},r=t.track;return r.metadata.name!==void 0&&(e.name=r.metadata.name),e},G=(t,e,r=!0)=>{let i=t*e;return r?Math.round(i):i},di=class extends ci{constructor(e,r){super(e),this.writer=null,this.boxWriter=null,this.initWriter=null,this.initBoxWriter=null,this.auxTarget=new tt,this.auxWriter=new It(this.auxTarget,!1),this.auxBoxWriter=new vt(this.auxWriter),this.mdat=null,this.ftypSize=null,this.trackDatas=[],this.allTracksKnown=Y(),this.creationTime=Math.floor(Date.now()/1e3)+Fc,this.finalizedChunks=[],this.nextFragmentNumber=1,this.maxWrittenTimestamp=-1/0,this.minWrittenTimestamp=1/0,this.maxWrittenEndTimestamp=-1/0,this.segmentHeaderSize=null,this.format=r,this.isQuickTime=r instanceof $t,this.isCmaf=r instanceof Gt,this.minimumFragmentDuration=r._options.minimumFragmentDuration??(r instanceof Gt?1/0:1)}async start(){let e=await this.mutex.acquire();if(this.isCmaf?(this.fastStart="fragmented",this.isFragmented=!0):(this.writer=await this.output._getRootWriter(i=>this.format._options.fastStart!==void 0?this.format._options.fastStart==="fragmented":i instanceof tt),this.boxWriter=new vt(this.writer),this.fastStart=this.format._options.fastStart??(this.writer.target instanceof tt?"in-memory":!1),this.isFragmented=this.fastStart==="fragmented"),this.isCmaf){if(!this.output._hasInitTarget())throw new Error("CMAF outputs require the initTarget field in OutputOptions to be set; the init segment will be written to it.");let i=await this.output._getInitTarget(),s=new It(i,!0);s.start(),this.initWriter=s,this.initBoxWriter=new vt(s)}let r=this.output._tracks.some(i=>i.isVideoTrack()&&i.source._codec==="avc");{let i=this.initBoxWriter??this.boxWriter;if(p(i),this.format._options.onFtyp&&i.writer.startTrackingWrites(),i.writeBox(ko({isQuickTime:this.isQuickTime,holdsAvc:r,fragmented:this.isFragmented,cmaf:this.isCmaf})),this.format._options.onFtyp){let{data:s,start:o}=i.writer.stopTrackingWrites();this.format._options.onFtyp(s,o)}this.ftypSize=i.writer.getPos(),this.isCmaf&&await this.initWriter.flush()}if(this.fastStart!=="in-memory")if(this.fastStart==="reserve"){for(let i of this.output._tracks)if(i.metadata.maximumPacketCount===void 0)throw new Error("All tracks must specify maximumPacketCount in their metadata when using fastStart: 'reserve'.")}else this.isFragmented||(p(this.writer),p(this.boxWriter),this.format._options.onMdat&&this.writer.startTrackingWrites(),this.mdat=kr(!0),this.boxWriter.writeBox(this.mdat));await this.writer?.flush(),e()}allTracksAreKnown(){for(let e of this.output._tracks)if(!e.source._closed&&!this.trackDatas.some(r=>r.track===e))return!1;return!0}async getMimeType(){await this.allTracksKnown.promise;let e=this.trackDatas.map(r=>r.type==="video"||r.type==="audio"?r.info.decoderConfig.codec:{webvtt:"wvtt"}[r.track.source._codec]);return Wr({isQuickTime:this.isQuickTime,hasVideo:this.trackDatas.some(r=>r.type==="video"),hasAudio:this.trackDatas.some(r=>r.type==="audio"),codecStrings:e})}getVideoTrackData(e,r,i){let s=this.trackDatas.find(f=>f.track===e);if(s)return s;us(i),p(i),p(i.decoderConfig);let o={...i.decoderConfig};p(o.codedWidth!==void 0),p(o.codedHeight!==void 0);let n=!1;if(e.source._codec==="avc"&&!o.description){let f=ws(r.data);if(!f)throw new Error("Couldn't extract an AVCDecoderConfigurationRecord from the AVC packet. Make sure the packets are in Annex B format (as specified in ITU-T-REC-H.264) when not providing a description, or provide a description (must be an AVCDecoderConfigurationRecord as specified in ISO 14496-15) and ensure the packets are in AVCC format.");o.description=ys(f),n=!0}else if(e.source._codec==="hevc"&&!o.description){let f=Ts(r.data);if(!f)throw new Error("Couldn't extract an HEVCDecoderConfigurationRecord from the HEVC packet. Make sure the packets are in Annex B format (as specified in ITU-T-REC-H.265) when not providing a description, or provide a description (must be an HEVCDecoderConfigurationRecord as specified in ISO 14496-15) and ensure the packets are in HEVC format.");o.description=xs(f),n=!0}let a=Hn(1/(e.metadata.frameRate??_e),1e6).den,c=o.displayAspectWidth,l=o.displayAspectHeight,u=c===void 0||l===void 0?{num:1,den:1}:gt({num:c*o.codedHeight,den:l*o.codedWidth}),d={muxer:this,track:e,type:"video",info:{width:o.codedWidth,height:o.codedHeight,pixelAspectRatio:u,decoderConfig:o,requiresAnnexBTransformation:n},timescale:a,samples:[],sampleQueue:[],timestampProcessingQueue:[],timeToSampleTable:[],compositionTimeOffsetTable:[],lastTimescaleUnits:null,lastSample:null,startTimestampOffset:null,finalizedChunks:[],currentChunk:null,compactlyCodedChunkTable:[],closed:!1};return this.trackDatas.push(d),this.trackDatas.sort((f,h)=>f.track.id-h.track.id),this.allTracksAreKnown()&&this.allTracksKnown.resolve(),d}getAudioTrackData(e,r,i){let s=this.trackDatas.find(c=>c.track===e);if(s)return s;ls(i),p(i),p(i.decoderConfig);let o={...i.decoderConfig},n=!1;if(e.source._codec==="aac"&&!o.description){let c=ji(Ze.tempFromBytes(r.data));if(!c)throw new Error("Couldn't parse ADTS header from the AAC packet. Make sure the packets are in ADTS format (as specified in ISO 13818-7) when not providing a description, or provide a description (must be an AudioSpecificConfig as specified in ISO 14496-3) and ensure the packets are raw AAC data.");let l=ur[c.samplingFrequencyIndex],u=Mr[c.channelConfiguration];if(l===void 0||u===void 0)throw new Error("Invalid ADTS frame header.");o.description=zr({objectType:c.objectType,sampleRate:l,numberOfChannels:u}),n=!0}let a={muxer:this,track:e,type:"audio",info:{numberOfChannels:i.decoderConfig.numberOfChannels,sampleRate:i.decoderConfig.sampleRate,decoderConfig:o,requiresPcmTransformation:!this.isFragmented&&te.includes(e.source._codec),expectedNextPcmPacketTimestamp:null,requiresAdtsStripping:n,firstPacket:r},timescale:o.sampleRate,samples:[],sampleQueue:[],timestampProcessingQueue:[],timeToSampleTable:[],compositionTimeOffsetTable:[],lastTimescaleUnits:null,lastSample:null,startTimestampOffset:null,finalizedChunks:[],currentChunk:null,compactlyCodedChunkTable:[],closed:!1};return this.trackDatas.push(a),this.trackDatas.sort((c,l)=>c.track.id-l.track.id),this.allTracksAreKnown()&&this.allTracksKnown.resolve(),a}getSubtitleTrackData(e,r){let i=this.trackDatas.find(o=>o.track===e);if(i)return i;ds(r),p(r),p(r.config);let s={muxer:this,track:e,type:"subtitle",info:{config:r.config},timescale:1e3,samples:[],sampleQueue:[],timestampProcessingQueue:[],timeToSampleTable:[],compositionTimeOffsetTable:[],lastTimescaleUnits:null,lastSample:null,startTimestampOffset:null,finalizedChunks:[],currentChunk:null,compactlyCodedChunkTable:[],closed:!1,lastCueEndTimestamp:0,cueQueue:[],nextSourceId:0,cueToSourceId:new WeakMap};return this.trackDatas.push(s),this.trackDatas.sort((o,n)=>o.track.id-n.track.id),this.allTracksAreKnown()&&this.allTracksKnown.resolve(),s}async addEncodedVideoPacket(e,r,i){let s=await this.mutex.acquire();try{let o=this.getVideoTrackData(e,r,i),n=r.data;if(o.info.requiresAnnexBTransformation){let c=[...Dt(n)].map(l=>n.subarray(l.offset,l.offset+l.length));if(c.length===0)throw new Error("Failed to transform packet data. Make sure all packets are provided in Annex B format, as specified in ITU-T-REC-H.264 and ITU-T-REC-H.265.");n=Ur(c,4)}this.validateTimestamp(o.track,r.timestamp,r.type==="key");let a=this.createSampleForTrack(o,n,r.timestamp,r.duration,r.type);await this.registerSample(o,a)}finally{s()}}async addEncodedAudioPacket(e,r,i){let s=await this.mutex.acquire();try{let o=this.getAudioTrackData(e,r,i),n=r.data;if(o.info.requiresAdtsStripping){let u=ji(Ze.tempFromBytes(n));if(!u)throw new Error("Expected ADTS frame, didn't get one.");let d=u.crcCheck===null?Qs:Ks;n=n.subarray(d)}this.validateTimestamp(o.track,r.timestamp,r.type==="key");let a=r.timestamp,c=r.duration;if(o.info.requiresPcmTransformation){let d=me(o.info.decoderConfig.codec).sampleSize*o.info.numberOfChannels;if(c=n.byteLength/d/o.info.sampleRate,o.info.expectedNextPcmPacketTimestamp!==null){let f=a-o.info.expectedNextPcmPacketTimestamp;if(f<.01)a=o.info.expectedNextPcmPacketTimestamp;else{let h=await this.padWithSilence(o,o.info.expectedNextPcmPacketTimestamp,f);a=o.info.expectedNextPcmPacketTimestamp+h}}o.info.expectedNextPcmPacketTimestamp=a+c}let l=this.createSampleForTrack(o,n,a,c,r.type);await this.registerSample(o,l)}finally{s()}}async padWithSilence(e,r,i){let s=G(i,e.timescale);if(i=s/e.timescale,s>0){let{sampleSize:o,silentValue:n}=me(e.info.decoderConfig.codec),a=s*e.info.numberOfChannels,c=new Uint8Array(o*a).fill(n),l=this.createSampleForTrack(e,new Uint8Array(c.buffer),r,i,"key");await this.registerSample(e,l)}return i}async addSubtitleCue(e,r,i){let s=await this.mutex.acquire();try{let o=this.getSubtitleTrackData(e,i);this.validateTimestamp(o.track,r.timestamp,!0),e.source._codec==="webvtt"&&(o.cueQueue.push(r),await this.processWebVTTCues(o,r.timestamp))}finally{s()}}async processWebVTTCues(e,r){for(;e.cueQueue.length>0;){let i=new Set([]);for(let l of e.cueQueue)p(l.timestamp<=r),p(e.lastCueEndTimestamp<=l.timestamp+l.duration),i.add(Math.max(l.timestamp,e.lastCueEndTimestamp)),i.add(l.timestamp+l.duration);let s=[...i].sort((l,u)=>l-u),o=s[0],n=s[1]??o;if(r<n)break;if(e.lastCueEndTimestamp<o){this.auxWriter.seek(0);let l=Io();this.auxBoxWriter.writeBox(l);let u=this.auxTarget._getSlice(0,this.auxWriter.getPos()),d=this.createSampleForTrack(e,u,e.lastCueEndTimestamp,o-e.lastCueEndTimestamp,"key");await this.registerSample(e,d),e.lastCueEndTimestamp=o}this.auxWriter.seek(0);for(let l=0;l<e.cueQueue.length;l++){let u=e.cueQueue[l];if(u.timestamp>=n)break;dn.lastIndex=0;let d=dn.test(u.text),f=u.timestamp+u.duration,h=e.cueToSourceId.get(u);if(h===void 0&&n<f&&(h=e.nextSourceId++,e.cueToSourceId.set(u,h)),u.notes){let g=Bo(u.notes);this.auxBoxWriter.writeBox(g)}let m=Po(u.text,d?o:null,u.identifier??null,u.settings??null,h??null);this.auxBoxWriter.writeBox(m),f===n&&e.cueQueue.splice(l--,1)}let a=this.auxTarget._getSlice(0,this.auxWriter.getPos()),c=this.createSampleForTrack(e,a,o,n-o,"key");await this.registerSample(e,c),e.lastCueEndTimestamp=n}}createSampleForTrack(e,r,i,s,o){return{timestamp:i,decodeTimestamp:i,duration:s,data:r,size:r.byteLength,type:o,timescaleUnitsToNextSample:G(s,e.timescale)}}processTimestamps(e,r){if(e.timestampProcessingQueue.length===0)return;if(e.type==="audio"&&e.info.requiresPcmTransformation){this.isFragmented||(e.startTimestampOffset??=e.timestampProcessingQueue[0].timestamp);let s=0;for(let o=0;o<e.timestampProcessingQueue.length;o++){let n=e.timestampProcessingQueue[o],a=G(n.duration,e.timescale);s+=a}if(e.timeToSampleTable.length===0)e.timeToSampleTable.push({sampleCount:s,sampleDelta:1});else{let o=X(e.timeToSampleTable);o.sampleCount+=s}e.timestampProcessingQueue.length=0;return}let i=e.timestampProcessingQueue.map(s=>s.timestamp).sort((s,o)=>s-o);this.isFragmented||(e.startTimestampOffset??=i[0]);for(let s=0;s<e.timestampProcessingQueue.length;s++){let o=e.timestampProcessingQueue[s];o.decodeTimestamp=i[s];let n=G(o.timestamp-o.decodeTimestamp,e.timescale),a=G(o.duration,e.timescale);if(e.lastTimescaleUnits!==null){p(e.lastSample);let c=G(o.decodeTimestamp,e.timescale,!1),l=Math.round(c-e.lastTimescaleUnits);if(p(l>=0),e.lastTimescaleUnits+=l,e.lastSample.timescaleUnitsToNextSample=l,!this.isFragmented){let u=X(e.timeToSampleTable);if(p(u),u.sampleCount===1){u.sampleDelta=l;let f=e.timeToSampleTable[e.timeToSampleTable.length-2];f&&f.sampleDelta===l&&(f.sampleCount++,e.timeToSampleTable.pop(),u=f)}else u.sampleDelta!==l&&(u.sampleCount--,e.timeToSampleTable.push(u={sampleCount:1,sampleDelta:l}));u.sampleDelta===a?u.sampleCount++:e.timeToSampleTable.push({sampleCount:1,sampleDelta:a});let d=X(e.compositionTimeOffsetTable);p(d),d.sampleCompositionTimeOffset===n?d.sampleCount++:e.compositionTimeOffsetTable.push({sampleCount:1,sampleCompositionTimeOffset:n})}}else e.lastTimescaleUnits=G(o.decodeTimestamp,e.timescale,!1),this.isFragmented||(e.timeToSampleTable.push({sampleCount:1,sampleDelta:a}),e.compositionTimeOffsetTable.push({sampleCount:1,sampleCompositionTimeOffset:n}));e.lastSample=o}if(e.timestampProcessingQueue.length=0,p(e.lastSample),p(e.lastTimescaleUnits!==null),r!==void 0&&e.lastSample.timescaleUnitsToNextSample===0){p(r.type==="key");let s=G(r.timestamp,e.timescale,!1),o=Math.round(s-e.lastTimescaleUnits);e.lastSample.timescaleUnitsToNextSample=o}}async registerSample(e,r){r.type==="key"&&this.processTimestamps(e,r),e.timestampProcessingQueue.push(r),this.isFragmented?(e.sampleQueue.push(r),await this.interleaveSamples()):this.fastStart==="reserve"?await this.registerSampleFastStartReserve(e,r):await this.addSampleToTrack(e,r)}async addSampleToTrack(e,r){if(!this.isFragmented&&(e.samples.push(r),this.fastStart==="reserve")){let s=e.track.metadata.maximumPacketCount;if(p(s!==void 0),e.samples.length>s)throw new Error(`Track #${e.track.id} has already reached the maximum packet count (${s}). Either add less packets or increase the maximum packet count.`)}let i=!1;if(!e.currentChunk)i=!0;else{e.currentChunk.startTimestamp=Math.min(e.currentChunk.startTimestamp,r.timestamp);let s=r.timestamp-e.currentChunk.startTimestamp;if(this.isFragmented){let o=this.trackDatas.every(n=>{if(e===n)return r.type==="key";let a=n.sampleQueue[0];return a?a.type==="key":n.closed});s>=this.minimumFragmentDuration&&o&&r.timestamp>this.maxWrittenTimestamp&&(i=!0,await this.finalizeFragment())}else i=s>=.5}i&&(e.currentChunk&&await this.finalizeCurrentChunk(e),e.currentChunk={startTimestamp:r.timestamp,samples:[],offset:null,moofOffset:null}),p(e.currentChunk),e.currentChunk.samples.push(r),this.isFragmented&&(this.maxWrittenTimestamp=Math.max(this.maxWrittenTimestamp,r.timestamp),this.maxWrittenEndTimestamp=Math.max(this.maxWrittenEndTimestamp,r.timestamp+r.duration),this.minWrittenTimestamp=Math.min(this.minWrittenTimestamp,r.timestamp))}async finalizeCurrentChunk(e){if(p(!this.isFragmented),p(this.writer),!e.currentChunk)return;e.finalizedChunks.push(e.currentChunk),this.finalizedChunks.push(e.currentChunk);let r=e.currentChunk.samples.length;if(e.type==="audio"&&e.info.requiresPcmTransformation&&(r=e.currentChunk.samples.reduce((i,s)=>i+G(s.duration,e.timescale),0)),(e.compactlyCodedChunkTable.length===0||X(e.compactlyCodedChunkTable).samplesPerChunk!==r)&&e.compactlyCodedChunkTable.push({firstChunk:e.finalizedChunks.length,samplesPerChunk:r}),this.fastStart==="in-memory"){e.currentChunk.offset=0;return}e.currentChunk.offset=this.writer.getPos();for(let i of e.currentChunk.samples)p(i.data),this.writer.write(i.data),i.data=null;await this.writer.flush()}async interleaveSamples(e=!1){if(p(this.isFragmented),!(!e&&!this.allTracksAreKnown()))e:for(;;){let r=null,i=1/0;for(let o of this.trackDatas){if(!e&&o.sampleQueue.length===0&&!o.closed)break e;o.sampleQueue.length>0&&o.sampleQueue[0].timestamp<i&&(r=o,i=o.sampleQueue[0].timestamp)}if(!r)break;let s=r.sampleQueue.shift();await this.addSampleToTrack(r,s)}}async finalizeFragment(e=!this.isCmaf){p(this.isFragmented);let r=this.nextFragmentNumber++;if(r===1){let h=this.initBoxWriter??this.boxWriter;p(h),this.format._options.onMoov&&h.writer.startTrackingWrites(),this.ensureOneEnabledTrack();let m=Kt(this);if(h.writeBox(m),this.format._options.onMoov){let{data:g,start:w}=h.writer.stopTrackingWrites();this.format._options.onMoov(g,w)}if(this.isCmaf){p(this.initWriter),await this.initWriter.flush(),await this.initWriter.finalize(),this.writer=await this.output._getRootWriter(!0),this.boxWriter=new vt(this.writer);let g=this.boxWriter.measureBox(gn()),w=this.boxWriter.measureBox(wn(this,0));this.segmentHeaderSize=g+w,this.writer.seek(this.segmentHeaderSize)}}p(this.writer),p(this.boxWriter);let i=this.trackDatas.filter(h=>h.currentChunk),s=bn(r,i),o=this.writer.getPos(),n=o+this.boxWriter.measureBox(s),a=n+Ee,c=1/0;for(let h of i){h.currentChunk.offset=a,h.currentChunk.moofOffset=o;for(let m of h.currentChunk.samples)a+=m.size;c=Math.min(c,h.currentChunk.startTimestamp)}let l=a-n,u=l>=2**32;if(u)for(let h of i)h.currentChunk.offset+=je-Ee;this.format._options.onMoof&&this.writer.startTrackingWrites();let d=bn(r,i);if(this.boxWriter.writeBox(d),this.format._options.onMoof){let{data:h,start:m}=this.writer.stopTrackingWrites();this.format._options.onMoof(h,m,c)}p(this.writer.getPos()===n),this.format._options.onMdat&&this.writer.startTrackingWrites();let f=kr(u);f.size=l,this.boxWriter.writeBox(f),this.writer.seek(n+(u?je:Ee));for(let h of i)for(let m of h.currentChunk.samples)this.writer.write(m.data),m.data=null;if(this.format._options.onMdat){let{data:h,start:m}=this.writer.stopTrackingWrites();this.format._options.onMdat(h,m)}for(let h of i)h.finalizedChunks.push(h.currentChunk),this.finalizedChunks.push(h.currentChunk),h.currentChunk=null;e&&await this.writer.flush()}async registerSampleFastStartReserve(e,r){if(p(this.writer),p(this.boxWriter),this.allTracksAreKnown()){if(!this.mdat){this.ensureOneEnabledTrack();let i=Kt(this),o=this.boxWriter.measureBox(i)+this.computeSampleTableSizeUpperBound()+4096;p(this.ftypSize!==null),this.writer.seek(this.ftypSize+o),this.format._options.onMdat&&this.writer.startTrackingWrites(),this.mdat=kr(!0),this.boxWriter.writeBox(this.mdat);for(let n of this.trackDatas){for(let a of n.sampleQueue)await this.addSampleToTrack(n,a);n.sampleQueue.length=0}}await this.addSampleToTrack(e,r)}else e.sampleQueue.push(r)}computeSampleTableSizeUpperBound(){p(this.fastStart==="reserve");let e=0;for(let r of this.trackDatas){let i=r.track.metadata.maximumPacketCount;p(i!==void 0),e+=8*Math.ceil(2/3*i),e+=4*i,e+=8*Math.ceil(2/3*i),e+=12*Math.ceil(2/3*i),e+=4*i,e+=8*i}return e}async onTrackClose(e){let r=await this.mutex.acquire(),i=this.trackDatas.find(s=>s.track===e);i&&(i.closed=!0,i.type==="subtitle"&&e.source._codec==="webvtt"&&await this.processWebVTTCues(i,1/0),this.processTimestamps(i)),this.allTracksAreKnown()&&this.allTracksKnown.resolve(),this.isFragmented&&await this.interleaveSamples(),r()}ensureOneEnabledTrack(){for(let e of["video","audio","subtitle"]){let r=this.trackDatas.filter(s=>s.type===e);if(r.length===0)continue;if(!r.some(s=>s.track.metadata.disposition?.default!==!1)){let s=r[0];s.track.metadata.disposition={...s.track.metadata.disposition,default:!0}}}}async finalize(){let e=await this.mutex.acquire();this.allTracksKnown.resolve(),this.ensureOneEnabledTrack();for(let r of this.trackDatas)r.closed=!0,r.type==="subtitle"&&r.track.source._codec==="webvtt"&&await this.processWebVTTCues(r,1/0),this.processTimestamps(r);if(this.isFragmented)await this.interleaveSamples(!0),await this.finalizeFragment(!1);else for(let r of this.trackDatas){await this.finalizeCurrentChunk(r),p(r.startTimestampOffset!==null);for(let i=0;i<r.samples.length;i++){let s=r.samples[i];s.timestamp-=r.startTimestampOffset,s.decodeTimestamp-=r.startTimestampOffset}}if(p(this.writer),p(this.boxWriter),this.fastStart==="in-memory"){this.mdat=kr(!1);let r;for(let s=0;s<2;s++){let o=Kt(this),n=this.boxWriter.measureBox(o);r=this.boxWriter.measureBox(this.mdat);let a=this.writer.getPos()+n+r;for(let c of this.finalizedChunks){c.offset=a;for(let{data:l}of c.samples)p(l),a+=l.byteLength,r+=l.byteLength}if(a<2**32)break;r>=2**32&&(this.mdat.largeSize=!0)}this.format._options.onMoov&&this.writer.startTrackingWrites();let i=Kt(this);if(this.boxWriter.writeBox(i),this.format._options.onMoov){let{data:s,start:o}=this.writer.stopTrackingWrites();this.format._options.onMoov(s,o)}this.format._options.onMdat&&this.writer.startTrackingWrites(),this.mdat.size=r,this.boxWriter.writeBox(this.mdat);for(let s of this.finalizedChunks)for(let o of s.samples)p(o.data),this.writer.write(o.data),o.data=null;if(this.format._options.onMdat){let{data:s,start:o}=this.writer.stopTrackingWrites();this.format._options.onMdat(s,o)}}else if(this.isFragmented)if(this.isCmaf){let r=this.segmentHeaderSize!==null?this.writer.getPos()-this.segmentHeaderSize:0;this.writer.seek(0),this.boxWriter.writeBox(gn()),this.boxWriter.writeBox(wn(this,r))}else{let r=this.writer.getPos(),i=vo(this.trackDatas);this.boxWriter.writeBox(i);let s=this.writer.getPos()-r;this.writer.seek(this.writer.getPos()-4),this.boxWriter.writeU32(s)}else{p(this.mdat);let r=this.boxWriter.offsets.get(this.mdat);p(r!==void 0);let i=this.writer.getPos()-r;if(this.mdat.size=i,this.mdat.largeSize=i>=2**32,this.boxWriter.patchBox(this.mdat),this.format._options.onMdat){let{data:o,start:n}=this.writer.stopTrackingWrites();this.format._options.onMdat(o,n)}let s=Kt(this);if(this.fastStart==="reserve"){p(this.ftypSize!==null),this.writer.seek(this.ftypSize),this.format._options.onMoov&&this.writer.startTrackingWrites(),this.boxWriter.writeBox(s);let o=this.boxWriter.offsets.get(this.mdat)-this.writer.getPos();this.boxWriter.writeBox(Co(o))}else this.format._options.onMoov&&this.writer.startTrackingWrites(),this.boxWriter.writeBox(s);if(this.format._options.onMoov){let{data:o,start:n}=this.writer.stopTrackingWrites();this.format._options.onMoov(o,n)}}e()}};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var fi=class{constructor(e){this.sourceSampleRate=null,this.sourceNumberOfChannels=null,this.startTime=null,this.bufferStartFrame=0,this.maxWrittenFrame=null,this.targetSampleRate=e.targetSampleRate,this.targetNumberOfChannels=e.targetNumberOfChannels,this.onSample=e.onSample,this.bufferSizeInFrames=Math.floor(this.targetSampleRate*5),this.bufferSizeInSamples=this.bufferSizeInFrames*this.targetNumberOfChannels,this.outputBuffer=new Float32Array(this.bufferSizeInSamples)}doChannelMixerSetup(){p(this.sourceNumberOfChannels!==null);let e=this.sourceNumberOfChannels,r=this.targetNumberOfChannels;e===1&&r===2?this.channelMixer=(i,s)=>i[s*e]:e===1&&r===4?this.channelMixer=(i,s,o)=>i[s*e]*+(o<2):e===1&&r===6?this.channelMixer=(i,s,o)=>i[s*e]*+(o===2):e===2&&r===1?this.channelMixer=(i,s)=>{let o=s*e;return .5*(i[o]+i[o+1])}:e===2&&r===4?this.channelMixer=(i,s,o)=>i[s*e+o]*+(o<2):e===2&&r===6?this.channelMixer=(i,s,o)=>i[s*e+o]*+(o<2):e===4&&r===1?this.channelMixer=(i,s)=>{let o=s*e;return .25*(i[o]+i[o+1]+i[o+2]+i[o+3])}:e===4&&r===2?this.channelMixer=(i,s,o)=>{let n=s*e;return .5*(i[n+o]+i[n+o+2])}:e===4&&r===6?this.channelMixer=(i,s,o)=>{let n=s*e;return o<2?i[n+o]:o===2||o===3?0:i[n+o-2]}:e===6&&r===1?this.channelMixer=(i,s)=>{let o=s*e;return Math.SQRT1_2*(i[o]+i[o+1])+i[o+2]+.5*(i[o+4]+i[o+5])}:e===6&&r===2?this.channelMixer=(i,s,o)=>{let n=s*e;return i[n+o]+Math.SQRT1_2*(i[n+2]+i[n+o+4])}:e===6&&r===4?this.channelMixer=(i,s,o)=>{let n=s*e;return o<2?i[n+o]+Math.SQRT1_2*i[n+2]:i[n+o+2]}:this.channelMixer=(i,s,o)=>o<e?i[s*e+o]:0}ensureTempBufferSize(e){let r=this.tempSourceBuffer.length;for(;r<e;)r*=2;if(r!==this.tempSourceBuffer.length){let i=new Float32Array(r);i.set(this.tempSourceBuffer),this.tempSourceBuffer=i}}async add(e){this.sourceSampleRate===null&&(this.sourceSampleRate=e.sampleRate,this.sourceNumberOfChannels=e.numberOfChannels,this.startTime=e.timestamp,this.tempSourceBuffer=new Float32Array(this.sourceSampleRate*this.sourceNumberOfChannels),this.doChannelMixerSetup()),p(this.startTime!==null);let r=e.numberOfFrames*e.numberOfChannels;this.ensureTempBufferSize(r);let i=e.allocationSize({planeIndex:0,format:"f32"}),s=new Float32Array(this.tempSourceBuffer.buffer,0,i/4);e.copyTo(s,{planeIndex:0,format:"f32"});let o=e.timestamp-this.startTime,n=o+e.duration,a=Math.floor((o-1/this.sourceSampleRate)*this.targetSampleRate)+1,c=Math.ceil(n*this.targetSampleRate);for(let l=a;l<c;l++){if(l<this.bufferStartFrame)continue;for(;l>=this.bufferStartFrame+this.bufferSizeInFrames;)await this.finalizeCurrentBuffer(),this.bufferStartFrame+=this.bufferSizeInFrames;let u=l-this.bufferStartFrame;p(u<this.bufferSizeInFrames);let h=(l/this.targetSampleRate-o)*this.sourceSampleRate,m=Math.floor(h),g=Math.ceil(h),w=h-m;for(let y=0;y<this.targetNumberOfChannels;y++){let b=0,A=0;m>=0&&m<e.numberOfFrames&&(b=this.channelMixer(s,m,y)),g>=0&&g<e.numberOfFrames&&(A=this.channelMixer(s,g,y));let S=b+w*(A-b),T=u*this.targetNumberOfChannels+y;this.outputBuffer[T]+=S}this.maxWrittenFrame===null?this.maxWrittenFrame=u:this.maxWrittenFrame=Math.max(this.maxWrittenFrame,u)}}async finalizeCurrentBuffer(){if(this.maxWrittenFrame===null)return;p(this.startTime!==null);let e=(this.maxWrittenFrame+1)*this.targetNumberOfChannels,r=new Float32Array(e);r.set(this.outputBuffer.subarray(0,e));let i=new fe({format:"f32",sampleRate:this.targetSampleRate,numberOfChannels:this.targetNumberOfChannels,timestamp:this.startTime+this.bufferStartFrame/this.targetSampleRate,data:r});await this.onSample(i),this.outputBuffer.fill(0),this.maxWrittenFrame=null}finalize(){return this.finalizeCurrentBuffer()}};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var Er=class{constructor(){this._connectedTrack=null,this._closingPromise=null,this._closed=!1}_ensureValidAdd(){if(!this._connectedTrack)throw new Error("Source is not connected to an output track.");if(this._connectedTrack.output.state==="canceled")throw new Error("Output has been canceled.");if(this._connectedTrack.output.state==="finalizing"||this._connectedTrack.output.state==="finalized")throw new Error("Output has been finalized.");if(this._connectedTrack.output.state==="pending")throw new Error("Output has not started.");if(this._closed)throw new Error("Source is closed.")}async _start(){}async _flushAndClose(e){}close(){if(this._closingPromise)return;let e=this._connectedTrack;if(!e)throw new Error("Cannot call close without connecting the source to an output track.");if(e.output.state==="pending")throw new Error("Cannot call close before output has been started.");this._closingPromise=(async()=>{await this._flushAndClose(!1),this._closed=!0,!(e.output.state==="finalizing"||e.output.state==="finalized")&&e.output._muxer.onTrackClose(e)})()}async _flushOrWaitForOngoingClose(e){return this._closingPromise??=(async()=>{await this._flushAndClose(e),this._closed=!0})()}},Xt=class extends Er{constructor(e){if(super(),this._connectedTrack=null,!le.includes(e))throw new TypeError(`Invalid video codec '${e}'. Must be one of: ${le.join(", ")}.`);this._codec=e}},_n=(t,e)=>{if(t.metadata.hasOnlyKeyPackets&&e.type!=="key")throw new Error("Cannot add non-key packets to a hasOnlyKeyPackets video track.")},hi=class extends Xt{constructor(e){super(e)}add(e,r){if(!(e instanceof ee))throw new TypeError("packet must be an EncodedPacket.");if(e.isMetadataOnly)throw new TypeError("Metadata-only packets cannot be added.");if(r!==void 0&&(!r||typeof r!="object"))throw new TypeError("meta, when provided, must be an object.");return this._ensureValidAdd(),_n(this._connectedTrack,e),this._connectedTrack.output._muxer.addEncodedVideoPacket(this._connectedTrack,e,r)}},Sn=class{setError(e){this.errorSet||(this.error=e,this.errorSet=!0)}constructor(e,r){this.source=e,this.encodingConfig=r,this.ensureEncoderPromise=null,this.encoderInitialized=!1,this.encoder=null,this.muxer=null,this.lastMultipleOfKeyFrameInterval=-1,this.emittedEncoderPackets=0,this.codedWidth=null,this.codedHeight=null,this.outputWidth=null,this.outputHeight=null,this.frameRateLastSample=null,this.frameRateLastTimestamp=null,this.frameRateLastEndTimestamp=null,this.preciseTimings=[],this.customEncoder=null,this.customEncoderCallSerializer=new rt,this.customEncoderQueueSize=0,this.alphaEncoder=null,this.splitter=null,this.splitterCreationFailed=!1,this.alphaFrameQueue=[],this.error=null,this.errorSet=!1,this.lastMuxerPromise=Promise.resolve(),this.closed=!1}async add(e,r,i){let s=e;try{this.checkForEncoderError(),this.source._ensureValidAdd();let o=this.encodingConfig,n=o.sizeChangeBehavior??"deny",a=!1;if(this.codedWidth!==null&&this.codedHeight!==null){if((e.codedWidth!==this.codedWidth||e.codedHeight!==this.codedHeight)&&(a=!0,n==="deny"))throw new Error(`Video sample size must remain constant. Expected ${this.codedWidth}x${this.codedHeight}, got ${e.codedWidth}x${e.codedHeight}. To allow the sample size to change over time, set \`sizeChangeBehavior\` to a value other than 'deny' in the encoding options.`)}else this.codedWidth=e.codedWidth,this.codedHeight=e.codedHeight;if(o.transform?.width!==void 0||o.transform?.height!==void 0||o.transform?.rotate!==void 0||o.transform?.crop!==void 0||o.transform?.force===!0||a&&n!=="passThrough"){let d=o.transform?.width,f=o.transform?.height,h=o.transform?.fit??"fill";a&&n!=="passThrough"&&(p(this.outputWidth),p(this.outputHeight),p(n!=="deny"),d=this.outputWidth,f=this.outputHeight,h=n);let m=await e.transform({width:d,height:f,roundDimensionsTo:2,crop:o.transform?.crop,rotate:o.transform?.rotate,fit:h,alpha:o.alpha});(this.outputWidth===null||this.outputHeight===null)&&(this.outputWidth=m.displayWidth,this.outputHeight=m.displayHeight),r&&e.close(),e=m,r=!0}else(this.outputWidth===null||this.outputHeight===null)&&(this.outputWidth=e.codedWidth,this.outputHeight=e.codedHeight);let u=o.transform?.frameRate;if(u!==void 0){let d=e.timestamp+e.duration,f=Bi(e.timestamp,u);if(this.frameRateLastSample!==null)if(f<=this.frameRateLastTimestamp){this.frameRateLastSample.close(),this.frameRateLastSample=e.clone(),this.frameRateLastEndTimestamp=d;return}else await this.padFrameRate(f,i);e===s&&(e=e.clone(),r=!0),e.setTimestamp(f),e.setDuration(1/u),this.frameRateLastSample?.close(),this.frameRateLastSample=e.clone(),this.frameRateLastTimestamp=f,this.frameRateLastEndTimestamp=d}await this.processAndEncode(e,i)}finally{r&&e.close()}}async processAndEncode(e,r){let i=this.encodingConfig,s;if(i.transform?.process){let o=i.transform.process(e);if(o instanceof Promise&&(o=await o),o===null)return;Array.isArray(o)||(o=[o]),s=o.map(n=>n instanceof Ie?n:typeof VideoFrame<"u"&&n instanceof VideoFrame?new Ie(n):new Ie(n,{timestamp:e.timestamp,duration:e.duration}))}else s=[e];try{for(let o of s){if(this.encoderInitialized||(this.ensureEncoderPromise||this.ensureEncoder(o),this.encoderInitialized||await this.ensureEncoderPromise),p(this.encoderInitialized),this.closed)break;let n=this.encodingConfig.keyFrameInterval??2,a=Math.floor(o.timestamp/n),c={...o.encodeOptions,...r},l={...c,keyFrame:c.keyFrame!==void 0?c.keyFrame:n===0||a!==this.lastMultipleOfKeyFrameInterval};if(this.lastMultipleOfKeyFrameInterval=a,this.encodingConfig.onEncodedSample?.(o),this.customEncoder){this.customEncoderQueueSize++;let u=o.clone(),d=this.customEncoderCallSerializer.call(()=>this.customEncoder.encode(u,l)).catch(f=>this.setError(f)).finally(()=>{this.customEncoderQueueSize--,u.close()});this.customEncoderQueueSize>=4&&await d}else{p(this.encoder);let u=o.toVideoFrame(),d=Q(this.preciseTimings,u.timestamp,h=>h.microsecondTimestamp),f=d!==-1?this.preciseTimings[d]:null;if(f&&f.microsecondTimestamp===u.timestamp?(f.timestamp!==o.timestamp&&(f.timestampIsValid=!1),f.duration!==o.duration&&(f.durationIsValid=!1)):(this.preciseTimings.splice(d+1,0,{microsecondTimestamp:u.timestamp,timestamp:o.timestamp,duration:o.duration,timestampIsValid:!0,durationIsValid:!0}),this.preciseTimings.length>128&&this.preciseTimings.shift()),!this.alphaEncoder)this.encoder.encode(u,l),u.close();else if(!!u.format&&!u.format.includes("A")||this.splitterCreationFailed)this.alphaFrameQueue.push(null),this.encoder.encode(u,l),u.close();else{this.splitter||(this.splitter=new kn);let{colorFrame:m,alphaFrame:g}=await this.splitter.split(u);this.alphaFrameQueue.push(g),this.encoder.encode(m,l),m.close()}this.encoder.encodeQueueSize>=4&&await new Promise(h=>this.encoder.addEventListener("dequeue",h,{once:!0}))}await this.lastMuxerPromise}}finally{for(let o of s)o!==e&&o.close()}}async padFrameRate(e,r){let i=this.encodingConfig.transform.frameRate;p(this.frameRateLastSample);let s=Math.round((e-this.frameRateLastTimestamp)*i);for(let o=1;o<s;o++){let n=this.frameRateLastSample.clone();n.setTimestamp(this.frameRateLastTimestamp+o/i),n.setDuration(1/i),await this.processAndEncode(n,r),n.close()}}ensureEncoder(e){this.ensureEncoderPromise=(async()=>{let r=Zi({...this.encodingConfig,width:e.codedWidth,height:e.codedHeight,squarePixelWidth:e.squarePixelWidth,squarePixelHeight:e.squarePixelHeight,framerate:this.source._connectedTrack?.metadata.frameRate});this.encodingConfig.onEncoderConfig?.(r);let i=ei.find(s=>s.supports(this.encodingConfig.codec,r));if(i)this.customEncoder=new i,this.customEncoder.codec=this.encodingConfig.codec,this.customEncoder.config=r,this.customEncoder.onPacket=(s,o)=>{if(!(s instanceof ee))throw new TypeError("The first argument passed to onPacket must be an EncodedPacket.");if(o!==void 0&&(!o||typeof o!="object"))throw new TypeError("The second argument passed to onPacket must be an object or undefined.");_n(this.source._connectedTrack,s),this.encodingConfig.onEncodedPacket?.(s,o),this.lastMuxerPromise=this.muxer.addEncodedVideoPacket(this.source._connectedTrack,s,o).catch(n=>{this.setError(n)})},this.customEncoder.onError=s=>{this.setError(s)},await this.customEncoder.init();else{if(typeof VideoEncoder>"u")throw new Error("VideoEncoder is not supported by this browser.");if(r.alpha="discard",this.encodingConfig.alpha==="keep"&&(r.latencyMode="quality"),(r.width%2===1||r.height%2===1)&&(this.encodingConfig.codec==="avc"||this.encodingConfig.codec==="hevc"))throw new Error(`The dimensions ${r.width}x${r.height} are not supported for codec '${this.encodingConfig.codec}'; both width and height must be even numbers. Make sure to round your dimensions to the nearest even number.`);if(!(await VideoEncoder.isConfigSupported(r)).supported)throw new Error(`This specific encoder configuration (${r.codec}, ${r.bitrate} bps, ${r.width}x${r.height}, hardware acceleration: ${r.hardwareAcceleration??"no-preference"}) is not supported by this browser. Consider using another codec or changing your video parameters.`);let n=[],a=[],c=0,l=0,u=(f,h,m)=>{let g={};if(h){let S=new Uint8Array(h.byteLength);h.copyTo(S),g.alpha=S}let w=ee.fromEncodedChunk(f,g),y=Q(this.preciseTimings,f.timestamp,S=>S.microsecondTimestamp),b=y!==-1?this.preciseTimings[y]:null,A=null;this.emittedEncoderPackets===0&&w.type==="delta"&&m?.decoderConfig&&(A=Vt(this.encodingConfig.codec,m.decoderConfig,w.data)),(b&&b.microsecondTimestamp===f.timestamp||A!==null)&&(w=w.clone({timestamp:b?.timestampIsValid?b.timestamp:void 0,duration:b?.durationIsValid?b.duration:void 0,type:A??void 0})),_n(this.source._connectedTrack,w),this.encodingConfig.onEncodedPacket?.(w,m),this.lastMuxerPromise=this.muxer.addEncodedVideoPacket(this.source._connectedTrack,w,m).catch(S=>{this.setError(S)}),this.emittedEncoderPackets++},d=new Error("Encoding error").stack;if(this.encoder=new VideoEncoder({output:(f,h)=>{if(!this.alphaEncoder){u(f,null,h);return}let m=this.alphaFrameQueue.shift();p(m!==void 0),m?(this.alphaEncoder.encode(m,{keyFrame:f.type==="key"}),l++,m.close(),n.push({chunk:f,meta:h})):l===0?u(f,null,h):(a.push(c+l),n.push({chunk:f,meta:h}))},error:f=>{f.stack=d,this.setError(f)}}),this.encoder.configure(r),this.encodingConfig.alpha==="keep"){let f=new Error("Encoding error").stack;this.alphaEncoder=new VideoEncoder({output:(h,m)=>{l--;let g=n.shift();for(p(g!==void 0),u(g.chunk,h,g.meta),c++;a.length>0&&a[0]===c;){a.shift();let w=n.shift();p(w!==void 0),u(w.chunk,null,w.meta)}},error:h=>{h.stack=f,this.setError(h)}}),this.alphaEncoder.configure(r)}}p(this.source._connectedTrack),this.muxer=this.source._connectedTrack.output._muxer,this.encoderInitialized=!0})()}async flushAndClose(e){if(e||this.checkForEncoderError(),!e&&this.frameRateLastSample){let r=this.encodingConfig.transform.frameRate,i=Bi(this.frameRateLastEndTimestamp,r);await this.padFrameRate(i)}this.closed=!0,this.frameRateLastSample?.close(),this.frameRateLastSample=null,this.customEncoder?(e||this.customEncoderCallSerializer.call(()=>this.customEncoder.flush()),await this.customEncoderCallSerializer.call(()=>this.customEncoder.close())):this.encoder&&(e||(await this.encoder.flush(),await this.alphaEncoder?.flush(),await Fi(25)),this.encoder.state!=="closed"&&this.encoder.close(),this.alphaEncoder&&this.alphaEncoder.state!=="closed"&&this.alphaEncoder.close(),this.alphaFrameQueue.forEach(r=>r?.close()),this.splitter?.close()),e||this.checkForEncoderError()}getQueueSize(){return this.customEncoder?this.customEncoderQueueSize:this.encoder?.encodeQueueSize??0}checkForEncoderError(){if(this.errorSet)throw this.error}},xn=null,kn=class{constructor(){this.worker=null,this.pendingRequests=new Map,this.nextRequestId=0}split(e){if(!this.worker){if(!xn){let s=new Blob([`(${Mc.toString()})()`],{type:"application/javascript"});xn=URL.createObjectURL(s)}this.worker=new Worker(xn),this.worker.addEventListener("message",s=>{let o=s.data,n=this.pendingRequests.get(o.id);n&&(this.pendingRequests.delete(o.id),"error"in o?n.reject(new Error(o.error)):n.resolve({colorFrame:o.colorFrame,alphaFrame:o.alphaFrame}))}),this.worker.addEventListener("error",s=>{let o=new Error(s.message||"Color/alpha splitter worker error.");for(let n of this.pendingRequests.values())n.reject(o);this.pendingRequests.clear()})}let r=this.nextRequestId++,i=Y();return this.pendingRequests.set(r,i),this.worker.postMessage({id:r,sourceFrame:e},{transfer:[e]}),i.promise}close(){this.worker?.terminate(),this.worker=null;let e=new Error("Color/alpha splitter closed.");for(let r of this.pendingRequests.values())r.reject(e);this.pendingRequests.clear()}},Mc=()=>{let t=null,e=Promise.resolve();self.addEventListener("message",o=>{let{id:n,sourceFrame:a}=o.data;e=e.then(async()=>{try{let{colorFrame:c,alphaFrame:l}=await r(a);self.postMessage({id:n,colorFrame:c,alphaFrame:l},{transfer:[c,l]})}catch(c){self.postMessage({id:n,error:c.message})}finally{a.close()}})});let r=async o=>{let n=o.format;if(!n)throw new Error("CPU color/alpha splitting requires a known VideoFrame format.");let a=o.allocationSize();if((!t||t.byteLength!==a)&&(t=new Uint8Array(a)),await o.copyTo(t),n==="RGBA"||n==="BGRA")return i(t,n,o);if(n==="I420A"||n==="I420AP10"||n==="I420AP12"||n==="I422A"||n==="I422AP10"||n==="I422AP12"||n==="I444A"||n==="I444AP10"||n==="I444AP12")return s(t,n,o);throw new Error(`CPU color/alpha splitting does not support format '${n}'.`)},i=(o,n,a)=>{let c=a.visibleRect?.width??a.codedWidth,l=a.visibleRect?.height??a.codedHeight,u=c*l,d=Math.ceil(c/2),f=Math.ceil(l/2),h=u+d*f*2,m=new Uint8Array(h);for(let b=0,A=3;b<u;b++,A+=4)m[b]=o[A];m.fill(128,u);let g=new VideoFrame(o,{format:n==="RGBA"?"RGBX":"BGRX",codedWidth:c,codedHeight:l,timestamp:a.timestamp,duration:a.duration??void 0}),w={format:"I420",codedWidth:c,codedHeight:l,timestamp:a.timestamp,duration:a.duration??void 0,transfer:[m.buffer]},y=new VideoFrame(m,w);return{colorFrame:g,alphaFrame:y}},s=(o,n,a)=>{let c=a.visibleRect?.width??a.codedWidth,l=a.visibleRect?.height??a.codedHeight,u=n.includes("P10"),d=n.includes("P12"),f=u||d?2:1,h,m;n.startsWith("I420")?(h=Math.ceil(c/2),m=Math.ceil(l/2)):n.startsWith("I422")?(h=Math.ceil(c/2),m=l):(h=c,m=l);let g=c*l,w=h*m,y=g*f,b=w*f,A=g*f,S=y+b*2,T=n.replace("A",""),v=Math.ceil(c/2),I=Math.ceil(l/2),_=v*I,k=_*f,B=A+2*k,F=new Uint8Array(B),z=S;F.set(o.subarray(z,z+A),0);let U=A,J=u?512:d?2048:128;f===1?F.fill(J,U):new Uint16Array(F.buffer,U,2*_).fill(J);let W=u?"I420P10":d?"I420P12":"I420",$=new VideoFrame(o.subarray(0,S),{format:T,codedWidth:c,codedHeight:l,timestamp:a.timestamp,duration:a.duration??void 0}),j={format:W,codedWidth:c,codedHeight:l,timestamp:a.timestamp,duration:a.duration??void 0,transfer:[F.buffer]},ne=new VideoFrame(F,j);return{colorFrame:$,alphaFrame:ne}}},vr=class extends Xt{constructor(e){oo(e),super(e.codec),this._encoder=new Sn(this,e)}add(e,r){if(!(e instanceof Ie))throw new TypeError("videoSample must be a VideoSample.");return this._encoder.add(e,!1,r)}_flushAndClose(e){return this._encoder.flushAndClose(e)}};var Yt=class extends Er{constructor(e){if(super(),this._connectedTrack=null,!he.includes(e))throw new TypeError(`Invalid audio codec '${e}'. Must be one of: ${he.join(", ")}.`);this._codec=e}},mi=class extends Yt{constructor(e){super(e)}add(e,r){if(!(e instanceof ee))throw new TypeError("packet must be an EncodedPacket.");if(e.isMetadataOnly)throw new TypeError("Metadata-only packets cannot be added.");if(r!==void 0&&(!r||typeof r!="object"))throw new TypeError("meta, when provided, must be an object.");return this._ensureValidAdd(),this._connectedTrack.output._muxer.addEncodedAudioPacket(this._connectedTrack,e,r)}},Cn=class{setError(e){this.errorSet||(this.error=e,this.errorSet=!0)}constructor(e,r){this.source=e,this.encodingConfig=r,this.ensureEncoderPromise=null,this.encoderInitialized=!1,this.encoder=null,this.muxer=null,this.lastNumberOfChannels=null,this.lastSampleRate=null,this.isPcmEncoder=!1,this.outputSampleSize=null,this.writeOutputValue=null,this.customEncoder=null,this.customEncoderCallSerializer=new rt,this.customEncoderQueueSize=0,this.lastEndSampleIndex=null,this.resampler=null,this.error=null,this.errorSet=!1,this.lastMuxerPromise=Promise.resolve(),this.closed=!1}async add(e,r){try{if(this.checkForEncoderError(),this.source._ensureValidAdd(),this.lastNumberOfChannels!==null&&this.lastSampleRate!==null){if(e.numberOfChannels!==this.lastNumberOfChannels||e.sampleRate!==this.lastSampleRate)throw new Error(`Audio parameters must remain constant. Expected ${this.lastNumberOfChannels} channels at ${this.lastSampleRate} Hz, got ${e.numberOfChannels} channels at ${e.sampleRate} Hz.`)}else this.lastNumberOfChannels=e.numberOfChannels,this.lastSampleRate=e.sampleRate;let i=this.encodingConfig;i.transform?.numberOfChannels!==void 0||i.transform?.sampleRate!==void 0?(this.resampler||(this.resampler=new fi({targetNumberOfChannels:i.transform.numberOfChannels??e.numberOfChannels,targetSampleRate:i.transform.sampleRate??e.sampleRate,onSample:async o=>{await this.processAndEncode(o,!0)}})),await this.resampler.add(e)):await this.processAndEncode(e,r)}finally{r&&e.close()}}async processAndEncode(e,r){let i=this.encodingConfig;if(i.transform?.sampleFormat!==void 0&&ro(e.format)!==i.transform.sampleFormat){let s=io(e,i.transform.sampleFormat);r&&e.close(),e=s,r=!0}if(i.transform?.process){let s=i.transform.process(e);if(s instanceof Promise&&(s=await s),s===null)return;Array.isArray(s)||(s=[s]);for(let o of s){if(!(o instanceof fe))throw new TypeError("The audio process function must return an AudioSample, null, or an array of AudioSamples.");await this.encodeSample(o,!0)}r&&e.close()}else await this.encodeSample(e,r)}async encodeSample(e,r){try{if(this.encoderInitialized||(this.ensureEncoderPromise||this.ensureEncoder(e),this.encoderInitialized||await this.ensureEncoderPromise),p(this.encoderInitialized),this.closed)return;{let i=Math.round(e.timestamp*e.sampleRate),s=Math.round((e.timestamp+e.duration)*e.sampleRate);if(this.lastEndSampleIndex===null)this.lastEndSampleIndex=s;else{let o=i-this.lastEndSampleIndex;if(o>=64){let n=new fe({data:new Float32Array(o*e.numberOfChannels),format:"f32-planar",sampleRate:e.sampleRate,numberOfChannels:e.numberOfChannels,numberOfFrames:o,timestamp:this.lastEndSampleIndex/e.sampleRate});await this.encodeSample(n,!0)}this.lastEndSampleIndex+=e.numberOfFrames}}if(this.encodingConfig.onEncodedSample?.(e),this.customEncoder){this.customEncoderQueueSize++;let i=e.clone(),s=this.customEncoderCallSerializer.call(()=>this.customEncoder.encode(i)).catch(o=>this.setError(o)).finally(()=>{this.customEncoderQueueSize--,i.close()});this.customEncoderQueueSize>=4&&await s,await this.lastMuxerPromise}else if(this.isPcmEncoder)await this.doPcmEncoding(e,r);else{p(this.encoder);let i=e.toAudioData();this.encoder.encode(i),i.close(),r&&e.close(),this.encoder.encodeQueueSize>=4&&await new Promise(s=>this.encoder.addEventListener("dequeue",s,{once:!0})),await this.lastMuxerPromise}}finally{r&&e.close()}}async doPcmEncoding(e,r){p(this.outputSampleSize),p(this.writeOutputValue);let{numberOfChannels:i,numberOfFrames:s,sampleRate:o,timestamp:n}=e,a=2048,c=[];for(let f=0;f<s;f+=a){let h=Math.min(a,e.numberOfFrames-f),m=h*i*this.outputSampleSize,g=new ArrayBuffer(m),w=new DataView(g);c.push({frameCount:h,view:w})}let l=e.allocationSize({planeIndex:0,format:"f32-planar"}),u=new Float32Array(l/Float32Array.BYTES_PER_ELEMENT);for(let f=0;f<i;f++){e.copyTo(u,{planeIndex:f,format:"f32-planar"});for(let h=0;h<c.length;h++){let{frameCount:m,view:g}=c[h];for(let w=0;w<m;w++)this.writeOutputValue(g,(w*i+f)*this.outputSampleSize,u[h*a+w])}}r&&e.close();let d={decoderConfig:{codec:this.encodingConfig.codec,numberOfChannels:i,sampleRate:o}};for(let f=0;f<c.length;f++){let{frameCount:h,view:m}=c[f],g=m.buffer,w=f*a,y=new ee(new Uint8Array(g),"key",n+w/o,h/o);this.encodingConfig.onEncodedPacket?.(y,d),await this.muxer.addEncodedAudioPacket(this.source._connectedTrack,y,d)}}ensureEncoder(e){this.ensureEncoderPromise=(async()=>{let{numberOfChannels:r,sampleRate:i}=e,s=Ji({numberOfChannels:r,sampleRate:i,...this.encodingConfig});this.encodingConfig.onEncoderConfig?.(s);let o=ti.find(n=>n.supports(this.encodingConfig.codec,s));if(o)this.customEncoder=new o,this.customEncoder.codec=this.encodingConfig.codec,this.customEncoder.config=s,this.customEncoder.onPacket=(n,a)=>{if(!(n instanceof ee))throw new TypeError("The first argument passed to onPacket must be an EncodedPacket.");if(a!==void 0&&(!a||typeof a!="object"))throw new TypeError("The second argument passed to onPacket must be an object or undefined.");this.encodingConfig.onEncodedPacket?.(n,a),this.lastMuxerPromise=this.muxer.addEncodedAudioPacket(this.source._connectedTrack,n,a).catch(c=>{this.setError(c)})},this.customEncoder.onError=n=>{this.setError(n)},await this.customEncoder.init();else if(te.includes(this.encodingConfig.codec))this.initPcmEncoder();else{if(typeof AudioEncoder>"u")throw new Error("AudioEncoder is not supported by this browser.");if(!(await AudioEncoder.isConfigSupported(s)).supported)throw new Error(`This specific encoder configuration (${s.codec}, ${s.bitrate} bps, ${s.numberOfChannels} channels, ${s.sampleRate} Hz) is not supported by this browser. Consider using another codec or changing your audio parameters.`);let a=new Error("Encoding error").stack;this.encoder=new AudioEncoder({output:(c,l)=>{if(this.encodingConfig.codec==="aac"&&l?.decoderConfig){let d=!1;if(!l.decoderConfig.description||l.decoderConfig.description.byteLength<2?d=!0:d=zt(ie(l.decoderConfig.description)).objectType===0,d){let f=Number(X(s.codec.split(".")));l.decoderConfig.description=zr({objectType:f,numberOfChannels:l.decoderConfig.numberOfChannels,sampleRate:l.decoderConfig.sampleRate})}}let u=ee.fromEncodedChunk(c);u=u.clone({timestamp:sr(u.timestamp,s.sampleRate),duration:c.duration!=null?sr(u.duration,s.sampleRate):void 0}),this.encodingConfig.onEncodedPacket?.(u,l),this.lastMuxerPromise=this.muxer.addEncodedAudioPacket(this.source._connectedTrack,u,l).catch(d=>{this.setError(d)})},error:c=>{c.stack=a,this.setError(c)}}),this.encoder.configure(s)}p(this.source._connectedTrack),this.muxer=this.source._connectedTrack.output._muxer,this.encoderInitialized=!0})()}initPcmEncoder(){this.isPcmEncoder=!0;let e=this.encodingConfig.codec,{dataType:r,sampleSize:i,littleEndian:s}=me(e);switch(this.outputSampleSize=i,i){case 1:r==="unsigned"?this.writeOutputValue=(o,n,a)=>o.setUint8(n,K((a+1)*127.5,0,255)):r==="signed"?this.writeOutputValue=(o,n,a)=>{o.setInt8(n,K(Math.round(a*128),-128,127))}:r==="ulaw"?this.writeOutputValue=(o,n,a)=>{let c=K(Math.floor(a*32767),-32768,32767);o.setUint8(n,fo(c))}:r==="alaw"?this.writeOutputValue=(o,n,a)=>{let c=K(Math.floor(a*32767),-32768,32767);o.setUint8(n,mo(c))}:p(!1);break;case 2:r==="unsigned"?this.writeOutputValue=(o,n,a)=>o.setUint16(n,K((a+1)*32767.5,0,65535),s):r==="signed"?this.writeOutputValue=(o,n,a)=>o.setInt16(n,K(Math.round(a*32767),-32768,32767),s):p(!1);break;case 3:r==="unsigned"?this.writeOutputValue=(o,n,a)=>rr(o,n,K((a+1)*83886075e-1,0,16777215),s):r==="signed"?this.writeOutputValue=(o,n,a)=>Wn(o,n,K(Math.round(a*8388607),-8388608,8388607),s):p(!1);break;case 4:r==="unsigned"?this.writeOutputValue=(o,n,a)=>o.setUint32(n,K((a+1)*21474836475e-1,0,4294967295),s):r==="signed"?this.writeOutputValue=(o,n,a)=>o.setInt32(n,K(Math.round(a*2147483647),-2147483648,2147483647),s):r==="float"?this.writeOutputValue=(o,n,a)=>o.setFloat32(n,a,s):p(!1);break;case 8:r==="float"?this.writeOutputValue=(o,n,a)=>o.setFloat64(n,a,s):p(!1);break;default:ae(i),p(!1)}}async flushAndClose(e){e||this.checkForEncoderError(),!e&&this.resampler&&await this.resampler.finalize(),this.resampler=null,this.closed=!0,this.customEncoder?(e||this.customEncoderCallSerializer.call(()=>this.customEncoder.flush()),await this.customEncoderCallSerializer.call(()=>this.customEncoder.close())):this.encoder&&(e||await this.encoder.flush(),this.encoder.state!=="closed"&&this.encoder.close()),e||this.checkForEncoderError()}getQueueSize(){return this.customEncoder?this.customEncoderQueueSize:this.isPcmEncoder?0:this.encoder?.encodeQueueSize??0}checkForEncoderError(){if(this.errorSet)throw this.error}},pi=class extends Yt{constructor(e){co(e),super(e.codec),this._encoder=new Cn(this,e)}add(e){if(!(e instanceof fe))throw new TypeError("audioSample must be an AudioSample.");return this._encoder.add(e,!1)}_flushAndClose(e){return this._encoder.flushAndClose(e)}};var gi=class extends Er{constructor(e){if(super(),this._connectedTrack=null,!at.includes(e))throw new TypeError(`Invalid subtitle codec '${e}'. Must be one of: ${at.join(", ")}.`);this._codec=e}};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var Zt=class{getSupportedVideoCodecs(){return this.getSupportedCodecs().filter(e=>le.includes(e))}getSupportedAudioCodecs(){return this.getSupportedCodecs().filter(e=>he.includes(e))}getSupportedSubtitleCodecs(){return this.getSupportedCodecs().filter(e=>at.includes(e))}_codecUnsupportedHint(e){return""}},Jt=class extends Zt{constructor(e={}){if(!e||typeof e!="object")throw new TypeError("options must be an object.");if(e.fastStart!==void 0&&![!1,"in-memory","reserve","fragmented"].includes(e.fastStart))throw new TypeError("options.fastStart, when provided, must be false, 'in-memory', 'reserve', or 'fragmented'.");if(e.minimumFragmentDuration!==void 0&&(!Number.isFinite(e.minimumFragmentDuration)||e.minimumFragmentDuration<0))throw new TypeError("options.minimumFragmentDuration, when provided, must be a non-negative number.");if(e.onFtyp!==void 0&&typeof e.onFtyp!="function")throw new TypeError("options.onFtyp, when provided, must be a function.");if(e.onMoov!==void 0&&typeof e.onMoov!="function")throw new TypeError("options.onMoov, when provided, must be a function.");if(e.onMdat!==void 0&&typeof e.onMdat!="function")throw new TypeError("options.onMdat, when provided, must be a function.");if(e.onMoof!==void 0&&typeof e.onMoof!="function")throw new TypeError("options.onMoof, when provided, must be a function.");if(e.metadataFormat!==void 0&&!["mdir","mdta","udta","auto"].includes(e.metadataFormat))throw new TypeError("options.metadataFormat, when provided, must be either 'auto', 'mdir', 'mdta', or 'udta'.");super(),this._options=e}getSupportedTrackCounts(){return{video:{min:0,max:4294967295},audio:{min:0,max:4294967295},subtitle:{min:0,max:4294967295},total:{min:1,max:4294967295}}}get supportsVideoRotationMetadata(){return!0}get supportsTimestampedMediaData(){return!0}_createMuxer(e){return new di(e,this)}},dt=class extends Jt{constructor(e){super(e)}get _name(){return"MP4"}get fileExtension(){return".mp4"}get mimeType(){return"video/mp4"}getSupportedCodecs(){return[...le,...ot,"pcm-s16","pcm-s16be","pcm-s24","pcm-s24be","pcm-s32","pcm-s32be","pcm-f32","pcm-f32be","pcm-f64","pcm-f64be",...at]}_codecUnsupportedHint(e){return new $t().getSupportedCodecs().includes(e)?" Switching to MOV will grant support for this codec.":""}},Gt=class extends Jt{constructor(e){super(e)}get _name(){return"CMAF"}get fileExtension(){return".m4s"}get mimeType(){return"video/mp4"}getSupportedCodecs(){return[...le,...ot,"pcm-s16","pcm-s16be","pcm-s24","pcm-s24be","pcm-s32","pcm-s32be","pcm-f32","pcm-f32be","pcm-f64","pcm-f64be",...at]}},$t=class extends Jt{constructor(e){super(e)}get _name(){return"MOV"}get fileExtension(){return".mov"}get mimeType(){return"video/quicktime"}getSupportedCodecs(){return[...le,...he]}_codecUnsupportedHint(e){return new dt().getSupportedCodecs().includes(e)?" Switching to MP4 will grant support for this codec.":""}};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var zc=["video","audio","subtitle"],er=class t{constructor(e,r,i,s,o){this.id=e,this.output=r,this.type=i,this.source=s,this.metadata=o}isVideoTrack(){return this.type==="video"}isAudioTrack(){return this.type==="audio"}isSubtitleTrack(){return this.type==="subtitle"}canBePairedWith(e){if(!(e instanceof t))throw new TypeError("other must be an OutputTrack.");if(this===e)return!1;let r=Mi(this.metadata.group),i=Mi(e.metadata.group);for(let s of r)if(this.type!==e.type&&i.some(a=>s===a)||i.some(a=>s._pairedGroups.has(a)))return!0;return!1}},wi=class extends er{constructor(e,r,i,s){super(e,r,"video",i,s)}},yi=class extends er{constructor(e,r,i,s){super(e,r,"audio",i,s)}},bi=class extends er{constructor(e,r,i,s){super(e,r,"subtitle",i,s)}},ye=class t{constructor(){this._pairedGroups=new Set}pairWith(e){if(!(e instanceof t))throw new TypeError("other must be an OutputTrackGroup.");if(this===e)throw new TypeError("Cannot pair a group with itself.");this._pairedGroups.add(e),e._pairedGroups.add(this)}},En=t=>{if(!t||typeof t!="object")throw new TypeError("metadata must be an object.");if(t.languageCode!==void 0&&!pt(t.languageCode))throw new TypeError("metadata.languageCode, when provided, must be a three-letter, ISO 639-2/T language code.");if(t.name!==void 0&&typeof t.name!="string")throw new TypeError("metadata.name, when provided, must be a string.");if(t.disposition!==void 0&&$n(t.disposition),t.maximumPacketCount!==void 0&&(!Number.isInteger(t.maximumPacketCount)||t.maximumPacketCount<0))throw new TypeError("metadata.maximumPacketCount, when provided, must be a non-negative integer.");if(t.group!==void 0&&!(t.group instanceof ye)&&(!Array.isArray(t.group)||t.group.some(e=>!(e instanceof ye))))throw new TypeError("metadata.group, when provided, must be an OutputTrackGroup instance or an array of OutputTrackGroup instances.")},ft=class extends be{get target(){let e="Output.target cannot be used when using PathedTarget with an async callback. Use the 'target' event instead.";if(this._rootTargetPromise)throw new TypeError(e);let r=this._getRootTarget();if(r instanceof Promise)throw new TypeError(e);return r}constructor(e){if(super(),this.state="pending",this.defaultTrackGroup=new ye,this._onFinalize=null,this._unfinalizedTargets=new Set,this._rootWriterPromise=null,this._tracks=[],this._startPromise=null,this._cancelPromise=null,this._finalizePromise=null,this._mutex=new Rt,this._metadataTags={},this._rootTarget=null,this._rootTargetPromise=null,this._firstMediaStreamTimestamp=null,!e||typeof e!="object")throw new TypeError("options must be an object.");if(!(e.format instanceof Zt))throw new TypeError("options.format must be an OutputFormat.");if(!(e.target instanceof we||e.target instanceof Pt))throw new TypeError("options.target must be a Target or a PathedTarget.");if(e.target instanceof we&&this._rememberTarget(e.target),e.initTarget!==void 0&&!(e.initTarget instanceof we)&&typeof e.initTarget!="function")throw new Error("options.initTarget, when provided, must be a Target or a function that returns or resolves to a Target.");if(e.onFinalize!==void 0&&typeof e.onFinalize!="function")throw new TypeError("options.onFinalize, when provided, must be a function.");this.format=e.format,this._target=e.target,this._onFinalize=e.onFinalize??null,this._initTarget=e.initTarget??null,this._initTarget instanceof we&&this._rememberTarget(this._initTarget),this._muxer=e.format._createMuxer(this)}_getTargetValidated(e){p(this._target instanceof Pt);let r=this._target.getTarget(e),i=s=>{if(!(s instanceof we))throw new TypeError("getTarget must return a Target.");return s};return r instanceof Promise?r.then(i):i(r)}async _getTarget(e){p(this._target instanceof Pt);let r=await this._getTargetValidated(e);return this._emit("target",{target:r,request:e,isRoot:e.isRoot}),this.state==="canceled"?await r._close():this._rememberTarget(r),r}_rememberTarget(e){this._unfinalizedTargets.add(e),e.on("finalized",()=>this._unfinalizedTargets.delete(e),{once:!0})}async _getInitTarget(){if(p(this._initTarget!==null),this._initTarget instanceof we)return this._initTarget;let e=await this._initTarget();return this.state==="canceled"?await e._close():this._rememberTarget(e),e}_hasInitTarget(){return this._initTarget!==null}_getRootTarget(){if(this._rootTarget)return this._rootTarget;if(this._rootTargetPromise)return this._rootTargetPromise;if(this._target instanceof we)return this._emit("target",{target:this._target,request:null,isRoot:!0}),this._rootTarget=this._target,this._target;let e={path:this._target.rootPath,isRoot:!0,mimeType:this.format.mimeType},r=this._getTargetValidated(e),i=s=>(this.state==="canceled"?s._close():this._rememberTarget(s),this._emit("target",{target:s,request:e,isRoot:!0}),this._rootTarget=s,s);return r instanceof Promise?this._rootTargetPromise=r.then(i):i(r)}_getRootWriter(e){return this._rootWriterPromise??=(async()=>{let r=await this._getRootTarget(),i=new It(r,typeof e=="boolean"?e:e(r));return i.start(),i})()}addVideoTrack(e,r={}){if(!(e instanceof Xt))throw new TypeError("source must be a VideoSource.");if(En(r),r.rotation!==void 0&&![0,90,180,270].includes(r.rotation))throw new TypeError(`Invalid video rotation: ${r.rotation}. Has to be 0, 90, 180 or 270.`);if(!this.format.supportsVideoRotationMetadata&&r.rotation)throw new Error(`${this.format._name} does not support video rotation metadata.`);if(r.frameRate!==void 0&&(!Number.isFinite(r.frameRate)||r.frameRate<=0))throw new TypeError(`Invalid video frame rate: ${r.frameRate}. Must be a positive number.`);let i={...r};return i.group??=this.defaultTrackGroup,this._addTrack(new wi(this._tracks.length+1,this,e,i))}addAudioTrack(e,r={}){if(!(e instanceof Yt))throw new TypeError("source must be an AudioSource.");En(r);let i={...r};return i.group??=this.defaultTrackGroup,this._addTrack(new yi(this._tracks.length+1,this,e,i))}addSubtitleTrack(e,r={}){if(!(e instanceof gi))throw new TypeError("source must be a SubtitleSource.");En(r);let i={...r};return i.group??=this.defaultTrackGroup,this._addTrack(new bi(this._tracks.length+1,this,e,i))}setMetadataTags(e){if(cr(e),this.state!=="pending")throw new Error("Cannot set metadata tags after output has been started or canceled.");this._metadataTags=e}_addTrack(e){if(this.state!=="pending")throw new Error("Cannot add track after output has been started or canceled.");if(e.source._connectedTrack)throw new Error("Source is already used for a track.");let r=this.format.getSupportedTrackCounts(),i=this._tracks.reduce((n,a)=>n+(a.type===e.type?1:0),0),s=r[e.type].max;if(i===s)throw new Error(s===0?`${this.format._name} does not support ${e.type} tracks.`:`${this.format._name} does not support more than ${s} ${e.type} track${s===1?"":"s"}.`);let o=r.total.max;if(this._tracks.length===o)throw new Error(`${this.format._name} does not support more than ${o} tracks${o===1?"":"s"} in total.`);if(e.isVideoTrack()){let n=this.format.getSupportedVideoCodecs();if(n.length===0)throw new Error(`${this.format._name} does not support video tracks.`+this.format._codecUnsupportedHint(e.source._codec));if(!n.includes(e.source._codec))throw new Error(`Codec '${e.source._codec}' cannot be contained within ${this.format._name}. Supported video codecs are: ${n.map(a=>`'${a}'`).join(", ")}.`+this.format._codecUnsupportedHint(e.source._codec))}else if(e.isAudioTrack()){let n=this.format.getSupportedAudioCodecs();if(n.length===0)throw new Error(`${this.format._name} does not support audio tracks.`+this.format._codecUnsupportedHint(e.source._codec));if(!n.includes(e.source._codec))throw new Error(`Codec '${e.source._codec}' cannot be contained within ${this.format._name}. Supported audio codecs are: ${n.map(a=>`'${a}'`).join(", ")}.`+this.format._codecUnsupportedHint(e.source._codec))}else if(e.isSubtitleTrack()){let n=this.format.getSupportedSubtitleCodecs();if(n.length===0)throw new Error(`${this.format._name} does not support subtitle tracks.`+this.format._codecUnsupportedHint(e.source._codec));if(!n.includes(e.source._codec))throw new Error(`Codec '${e.source._codec}' cannot be contained within ${this.format._name}. Supported subtitle codecs are: ${n.map(a=>`'${a}'`).join(", ")}.`+this.format._codecUnsupportedHint(e.source._codec))}return this._tracks.push(e),e.source._connectedTrack=e,e}async start(){let e=this.format.getSupportedTrackCounts();for(let i of zc){let s=this._tracks.reduce((n,a)=>n+(a.type===i?1:0),0),o=e[i].min;if(s<o)throw new Error(o===e[i].max?`${this.format._name} requires exactly ${o} ${i} track${o===1?"":"s"}.`:`${this.format._name} requires at least ${o} ${i} track${o===1?"":"s"}.`)}let r=e.total.min;if(this._tracks.length<r)throw new Error(r===e.total.max?`${this.format._name} requires exactly ${r} track${r===1?"":"s"}.`:`${this.format._name} requires at least ${r} track${r===1?"":"s"}.`);if(this.state==="canceled")throw new Error("Output has been canceled.");return this._startPromise?(M._warn("Output has already been started."),this._startPromise):this._startPromise=(async()=>{this.state="started";let i=await this._mutex.acquire();try{await this._muxer.start();let s=this._tracks.map(o=>o.source._start());await Promise.all(s)}finally{i()}})()}getMimeType(){return this._muxer.getMimeType()}async cancel(){if(this._cancelPromise)return M._warn("Output has already been canceled."),this._cancelPromise;if(this.state==="finalizing"||this.state==="finalized"){this.state==="finalized"&&M._warn("Output has already been finalized.");return}return this._cancelPromise=(async()=>{this.state="canceled";let e=await this._mutex.acquire();try{let r=this._tracks.map(i=>i.source._flushOrWaitForOngoingClose(!0));await Promise.all(r),await Promise.all([...this._unfinalizedTargets].map(i=>i._close())),this._unfinalizedTargets.clear()}finally{e()}})()}async finalize(){if(this.state==="pending")throw new Error("Cannot finalize before starting.");if(this.state==="canceled")throw new Error("Cannot finalize after canceling.");return this._finalizePromise?(M._warn("Output has already been finalized."),this._finalizePromise):this._finalizePromise=(async()=>{this.state="finalizing";let e=await this._mutex.acquire();try{let r=this._tracks.map(i=>i.source._flushOrWaitForOngoingClose(!1));if(await Promise.all(r),await this._muxer.finalize(),this._rootWriterPromise){let i=await this._rootWriterPromise;i.finalized||(await i.flush(),await i.finalize())}this._onFinalize&&await this._onFinalize(),this.state="finalized"}finally{e()}})()}};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var Ai=t=>{if(!t||typeof t!="object")throw new TypeError("options.video, when provided, must be an object.");if(t?.discard!==void 0&&typeof t.discard!="boolean")throw new TypeError("options.video.discard, when provided, must be a boolean.");if(t?.forceTranscode!==void 0&&typeof t.forceTranscode!="boolean")throw new TypeError("options.video.forceTranscode, when provided, must be a boolean.");if(t?.codec!==void 0&&!le.includes(t.codec))throw new TypeError(`options.video.codec, when provided, must be one of: ${le.join(", ")}.`);if(t?.bitrate!==void 0&&!(t.bitrate instanceof xe)&&(!Number.isInteger(t.bitrate)||t.bitrate<=0))throw new TypeError("options.video.bitrate, when provided, must be a positive integer or a quality.");if(t?.width!==void 0&&(!Number.isInteger(t.width)||t.width<=0))throw new TypeError("options.video.width, when provided, must be a positive integer.");if(t?.height!==void 0&&(!Number.isInteger(t.height)||t.height<=0))throw new TypeError("options.video.height, when provided, must be a positive integer.");if(t?.fit!==void 0&&!["fill","contain","cover"].includes(t.fit))throw new TypeError("options.video.fit, when provided, must be one of 'fill', 'contain', or 'cover'.");if(t?.width!==void 0&&t.height!==void 0&&t.fit===void 0)throw new TypeError("When both options.video.width and options.video.height are provided, options.video.fit must also be provided.");if(t?.rotate!==void 0&&![0,90,180,270].includes(t.rotate))throw new TypeError("options.video.rotate, when provided, must be 0, 90, 180 or 270.");if(t?.allowRotationMetadata!==void 0&&typeof t.allowRotationMetadata!="boolean")throw new TypeError("options.video.allowRotationMetadata, when provided, must be a boolean.");if(t?.crop!==void 0&&xt(t.crop,"options.video."),t?.frameRate!==void 0&&(!Number.isFinite(t.frameRate)||t.frameRate<=0))throw new TypeError("options.video.frameRate, when provided, must be a finite positive number.");if(t?.alpha!==void 0&&!["discard","keep"].includes(t.alpha))throw new TypeError("options.video.alpha, when provided, must be either 'discard' or 'keep'.");if(t?.keyFrameInterval!==void 0&&(!Number.isFinite(t.keyFrameInterval)||t.keyFrameInterval<0))throw new TypeError("options.video.keyFrameInterval, when provided, must be a non-negative number.");if(t?.process!==void 0&&typeof t.process!="function")throw new TypeError("options.video.process, when provided, must be a function.");if(t?.processedWidth!==void 0&&(!Number.isInteger(t.processedWidth)||t.processedWidth<=0))throw new TypeError("options.video.processedWidth, when provided, must be a positive integer.");if(t?.processedHeight!==void 0&&(!Number.isInteger(t.processedHeight)||t.processedHeight<=0))throw new TypeError("options.video.processedHeight, when provided, must be a positive integer.");if(t?.hardwareAcceleration!==void 0&&!["no-preference","prefer-hardware","prefer-software"].includes(t.hardwareAcceleration))throw new TypeError("options.video.hardwareAcceleration, when provided, must be 'no-preference', 'prefer-hardware' or 'prefer-software'.");if(t?.group!==void 0&&!(t.group instanceof ye||Array.isArray(t.group)&&t.group.every(e=>e instanceof ye)))throw new TypeError("options.video.group, when provided, must be an OutputTrackGroup or an array of OutputTrackGroups.")},Ti=t=>{if(!t||typeof t!="object")throw new TypeError("options.audio, when provided, must be an object.");if(t?.discard!==void 0&&typeof t.discard!="boolean")throw new TypeError("options.audio.discard, when provided, must be a boolean.");if(t?.forceTranscode!==void 0&&typeof t.forceTranscode!="boolean")throw new TypeError("options.audio.forceTranscode, when provided, must be a boolean.");if(t?.codec!==void 0&&!he.includes(t.codec))throw new TypeError(`options.audio.codec, when provided, must be one of: ${he.join(", ")}.`);if(t?.bitrate!==void 0&&!(t.bitrate instanceof xe)&&(!Number.isInteger(t.bitrate)||t.bitrate<=0))throw new TypeError("options.audio.bitrate, when provided, must be a positive integer or a quality.");if(t?.numberOfChannels!==void 0&&(!Number.isInteger(t.numberOfChannels)||t.numberOfChannels<=0))throw new TypeError("options.audio.numberOfChannels, when provided, must be a positive integer.");if(t?.sampleRate!==void 0&&(!Number.isInteger(t.sampleRate)||t.sampleRate<=0))throw new TypeError("options.audio.sampleRate, when provided, must be a positive integer.");if(t?.sampleFormat!==void 0&&!["u8","s16","s32","f32"].includes(t.sampleFormat))throw new TypeError("options.audio.sampleFormat, when provided, must be one of: u8, s16, s32, f32.");if(t?.process!==void 0&&typeof t.process!="function")throw new TypeError("options.audio.process, when provided, must be a function.");if(t?.processedNumberOfChannels!==void 0&&(!Number.isInteger(t.processedNumberOfChannels)||t.processedNumberOfChannels<=0))throw new TypeError("options.audio.processedNumberOfChannels, when provided, must be a positive integer.");if(t?.processedSampleRate!==void 0&&(!Number.isInteger(t.processedSampleRate)||t.processedSampleRate<=0))throw new TypeError("options.audio.processedSampleRate, when provided, must be a positive integer.");if(t?.group!==void 0&&!(t.group instanceof ye||Array.isArray(t.group)&&t.group.every(e=>e instanceof ye)))throw new TypeError("options.audio.group, when provided, must be an OutputTrackGroup or an array of OutputTrackGroups.")},vn=2,In=48e3,Ir=class t{static async init(e){let r=new t(e);return await r._init(),r}constructor(e){if(this._addedCounts={video:0,audio:0,subtitle:0},this._totalTrackCount=0,this._nextOutputTrackId=0,this._outputTrackIds=[],this._outputOwnTrackGroups=[],this._trackPromises=[],this._executed=!1,this._synchronizer=new Pn,this._totalDuration=null,this._maxTimestamps=new Map,this._canceled=!1,this.onProgress=void 0,this._computeProgress=!1,this._lastProgress=0,this.isValid=!1,this.utilizedTracks=[],this.discardedTracks=[],!e||typeof e!="object")throw new TypeError("options must be an object.");if(!(e.input instanceof Et))throw new TypeError("options.input must be an Input.");if(!(e.output instanceof ft))throw new TypeError("options.output must be an Output.");if(e.tracks!==void 0&&e.tracks!=="all"&&e.tracks!=="primary")throw new TypeError("options.tracks, when provided, must be either 'all' or 'primary'.");if(e.output._tracks.length>0||Object.keys(e.output._metadataTags).length>0||e.output.state!=="pending")throw new TypeError("options.output must be fresh: no tracks or metadata tags added and not started.");if(e.video!==void 0&&typeof e.video!="function")if(Array.isArray(e.video))for(let s of e.video)Ai(s);else Ai(e.video);if(e.audio!==void 0&&typeof e.audio!="function")if(Array.isArray(e.audio))for(let s of e.audio)Ti(s);else Ti(e.audio);if(e.trim!==void 0&&(!e.trim||typeof e.trim!="object"))throw new TypeError("options.trim, when provided, must be an object.");if(e.trim?.start!==void 0&&!Number.isFinite(e.trim.start))throw new TypeError("options.trim.start, when provided, must be a finite number.");if(e.trim?.end!==void 0&&!Number.isFinite(e.trim.end))throw new TypeError("options.trim.end, when provided, must be a finite number.");if(e.trim?.start!==void 0&&e.trim.end!==void 0&&e.trim.start>=e.trim.end)throw new TypeError("options.trim.start must be less than options.trim.end.");if(e.tags!==void 0&&(typeof e.tags!="object"||!e.tags)&&typeof e.tags!="function")throw new TypeError("options.tags, when provided, must be an object or a function.");if(typeof e.tags=="object"&&cr(e.tags),e.showWarnings!==void 0&&typeof e.showWarnings!="boolean")throw new TypeError("options.showWarnings, when provided, must be a boolean.");this._options=e,this.input=e.input,this.output=e.output;let{promise:r,resolve:i}=Y();this._started=r,this._start=i}async _init(){let e=await this.input.getFormat(),r,i=this._options.tracks;if(i===void 0&&(i=e.name.includes("(HLS)")?"primary":"all"),i==="all")r=await this.input.getTracks();else if(i==="primary"){let h=await this.input.getPrimaryVideoTrack(),m=await this.input.getPrimaryAudioTrack();r=[h,m].filter(g=>g!==null)}else ae(i),p(!1);let s=this.output.format.getSupportedTrackCounts(),o=1,n=1,a=[],c=[];for(let h of r){let m;if(h.isVideoTrack())if(this._options.video)if(typeof this._options.video=="function"){let y=await this._options.video(h,o)??{};if(Array.isArray(y))for(let b of y)Ai(b);else Ai(y);m=Array.isArray(y)?y:[y],o++}else m=Array.isArray(this._options.video)?this._options.video:[this._options.video];else m=[{}];else if(h.isAudioTrack())if(this._options.audio)if(typeof this._options.audio=="function"){let y=await this._options.audio(h,n)??{};if(Array.isArray(y))for(let b of y)Ti(b);else Ti(y);m=Array.isArray(y)?y:[y],n++}else m=Array.isArray(this._options.audio)?this._options.audio:[this._options.audio];else m=[{}];else p(!1);let g=m.filter(y=>y.discard);for(let y of g)this.discardedTracks.push({track:h,reason:"discarded_by_user",trackOptions:y});if(m.length===g.length){m.length===0&&this.discardedTracks.push({track:h,reason:"discarded_by_user",trackOptions:{}});continue}let w=m.filter(y=>!y.discard);a.push(h),c.push(w)}this._options.trim?.start!==void 0?this._startTimestamp=this._options.trim.start:this._startTimestamp=Math.max(await this.input.getFirstTimestamp(a),0),this._endTimestamp=Math.max(this._options.trim?.end??1/0,this._startTimestamp);for(let h=0;h<a.length;h++){let m=a[h],g=c[h];for(let w of g){if(this._totalTrackCount===s.total.max){this.discardedTracks.push({track:m,reason:"max_track_count_reached",trackOptions:w});continue}if(this._addedCounts[m.type]===s[m.type].max){this.discardedTracks.push({track:m,reason:"max_track_count_of_type_reached",trackOptions:w});continue}let y=this._nextOutputTrackId++;m.isVideoTrack()?await this._processVideoTrack(m,w,y):m.isAudioTrack()?await this._processAudioTrack(m,w,y):p(!1)}}for(let h=0;h<this.utilizedTracks.length-1;h++)for(let m=h+1;m<this.utilizedTracks.length;m++){let g=this.utilizedTracks[h],w=this.utilizedTracks[m],y=this._outputOwnTrackGroups[h],b=this._outputOwnTrackGroups[m];p(y!==void 0),p(b!==void 0),y&&b&&g.canBePairedWith(w)&&y.pairWith(b)}let l=await this.input.getMetadataTags(),u;if(this._options.tags){let h=typeof this._options.tags=="function"?await this._options.tags(l):this._options.tags;cr(h),u=h}else u=l;let d=e.mimeType===this.output.format.mimeType,f=l.raw===u.raw;if(l.raw&&f&&!d&&delete u.raw,this.output.setMetadataTags(u),this.isValid=this._totalTrackCount>=s.total.min&&this._addedCounts.video>=s.video.min&&this._addedCounts.audio>=s.audio.min&&this._addedCounts.subtitle>=s.subtitle.min,this._options.showWarnings??!0){let h=[],m=this.discardedTracks.filter(g=>g.reason!=="discarded_by_user");m.length>0&&h.push("Some tracks had to be discarded from the conversion:",m),this.isValid||(h.length>0&&h.push(`

`),h.push(this._getInvalidityExplanation().join(""))),h.length>0&&M._warn(...h)}}_getInvalidityExplanation(){let e=[];if(this.discardedTracks.length===0)e.push("Due to missing tracks, this conversion cannot be executed.");else{let r=this.discardedTracks.every(i=>i.reason==="discarded_by_user"||i.reason==="no_encodable_target_codec")&&this.discardedTracks.some(i=>i.reason==="no_encodable_target_codec");if(e.push("Due to discarded tracks, this conversion cannot be executed."),r){let i=this.discardedTracks.flatMap(o=>o.reason==="discarded_by_user"?[]:o.track.type==="video"?this.output.format.getSupportedVideoCodecs():o.track.type==="audio"?this.output.format.getSupportedAudioCodecs():this.output.format.getSupportedSubtitleCodecs()),s=[...new Set(i)];s.length===1?e.push(`
Tracks were discarded because your environment is not able to encode '${s[0]}'.`):e.push(`
Tracks were discarded because your environment is not able to encode any of the following codecs: ${s.map(o=>`'${o}'`).join(", ")}.`),s.includes("mp3")&&e.push(`
The @mediabunny/mp3-encoder extension package provides support for encoding MP3.`),s.includes("aac")&&e.push(`
The @mediabunny/aac-encoder extension package provides support for encoding AAC.`),(s.includes("ac3")||s.includes("eac3"))&&e.push(`
The @mediabunny/ac3 extension package provides support for encoding and decoding AC-3/E-AC-3.`),s.includes("flac")&&e.push(`
The @mediabunny/flac-encoder extension package provides support for encoding FLAC.`)}else e.push(`
Check the discardedTracks field for more info.`)}return e}async execute(){if(!this.isValid)throw new Error(`Cannot execute this conversion because its output configuration is invalid. Make sure to always check the isValid field before executing a conversion.
`+this._getInvalidityExplanation().join(""));if(this._executed)throw new Error("Conversion cannot be executed twice.");this._executed=!0;for(let e of this._outputTrackIds)this._synchronizer.declareTrack(e);if(this.onProgress){let r=[...new Set(this.utilizedTracks)].map(async s=>await s.isLive()?1/0:await s.getDurationFromMetadata()??await s.computeDuration()),i=Math.max(0,...await Promise.all(r));this._computeProgress=!0,this._totalDuration=Math.min(i-this._startTimestamp,this._endTimestamp-this._startTimestamp);for(let s of this._outputTrackIds)this._maxTimestamps.set(s,0);this.onProgress?.(0,0)}await this.output.start(),this._start();try{await Promise.all(this._trackPromises)}catch(e){throw this._canceled||this.cancel(),e}if(this._canceled)throw new xi;if(await this.output.finalize(),this._computeProgress){let e=Math.min(...this._maxTimestamps.values());this.onProgress?.(1,e)}}async cancel(){if(!(this.output.state==="finalizing"||this.output.state==="finalized")){if(this._canceled){M._warn("Conversion already canceled.");return}this._canceled=!0,await this.output.cancel()}}async _processVideoTrack(e,r,i){let s=await e.getCodec();if(!s){this.discardedTracks.push({track:e,reason:"unknown_source_codec",trackOptions:r});return}let o,n=await e.getRotation(),a=ht(n+(r.rotate??0)),c=a,l=this.output.format.supportsVideoRotationMetadata&&(r.allowRotationMetadata??!0),u=await e.getSquarePixelWidth(),d=await e.getSquarePixelHeight(),[f,h]=a%180===0?[u,d]:[d,u],m=r.crop;m&&(m=Tr(m,f,h));let[g,w]=m?[m.width,m.height]:[f,h],y=g,b=w,A=y/b;r.width!==void 0&&r.height===void 0?(y=wt(r.width),b=wt(Math.round(y/A))):r.width===void 0&&r.height!==void 0?(b=wt(r.height),y=wt(Math.round(b*A))):r.width!==void 0&&r.height!==void 0&&(y=wt(r.width),b=wt(r.height));let S=await e.getFirstTimestamp(),T=this.output.format.getSupportedVideoCodecs(),v=!!r.forceTranscode||S<this._startTimestamp||!!r.frameRate||r.keyFrameInterval!==void 0||r.process!==void 0||r.bitrate!==void 0||!T.includes(s)||r.codec&&r.codec!==s||y!==g||b!==w||a!==0&&!l||!!m,I=r.alpha??"discard";if(v){if(!await e.canDecode()){this.discardedTracks.push({track:e,reason:"undecodable_source_codec",trackOptions:r});return}r.codec&&(T=T.filter(j=>j===r.codec));let F=r.bitrate??en,z=await lo(T,{width:r.process&&r.processedWidth?r.processedWidth:y,height:r.process&&r.processedHeight?r.processedHeight:b,bitrate:F});if(!z){this.discardedTracks.push({track:e,reason:"no_encodable_target_codec",trackOptions:r});return}let U={codec:z,bitrate:F,keyFrameInterval:r.keyFrameInterval,sizeChangeBehavior:r.fit??"passThrough",alpha:I,hardwareAcceleration:r.hardwareAcceleration,transform:{}};p(U.transform);let J=y!==g||b!==w||a!==0&&(!l||r.process!==void 0)||!!m||u!==await e.getCodedWidth()||d!==await e.getCodedHeight();if(!J){let j=new ft({format:new dt,target:new Cr}),ne=new vr(U);j.addVideoTrack(ne),await j.start();let Bt=await new _r(e).getSample(S);if(Bt)try{await ne.add(Bt),Bt.close(),await j.finalize()}catch(Vo){M._warn("An error occurred when probing encoder support. Falling back to rerender path.",Vo),j.cancel(),J=!0,U.transform.force=!0}else await j.cancel()}r.frameRate&&(U.transform.frameRate=r.frameRate),r.process&&(U.transform.process=r.process),J&&(c=0,U.transform.width=y,U.transform.height=b,U.transform.fit=r.fit??"fill",U.transform.rotate=ht(a-n),U.transform.crop=m,U.transform.alpha=I);let W=null;U.onEncodedSample=j=>{W=j.timestamp};let $=new vr(U);o=$,this._trackPromises.push((async()=>{await this._started;let j=new _r(e);for await(let ne of j.samples(this._startTimestamp,this._endTimestamp)){if(this._canceled){ne.close();return}let Ue=Math.max(ne.timestamp-this._startTimestamp,0);ne.setTimestamp(Ue),this._reportProgress(i,ne.timestamp+ne.duration),await $.add(ne),W!==null&&this._synchronizer.shouldWait(i,W)&&await this._synchronizer.wait(W),ne.close()}$.close(),this._synchronizer.closeTrack(i)})())}else{let B=new hi(s);o=B,this._trackPromises.push((async()=>{await this._started;let F=new Ye(e),U={decoderConfig:await e.getDecoderConfig()??void 0};for await(let J of F.packets(void 0,void 0,{verifyKeyPackets:!0})){if(this._canceled)return;if(J.timestamp>=this._endTimestamp)break;let W=J.clone({timestamp:J.timestamp-this._startTimestamp,sideData:I==="discard"?{}:J.sideData});p(W.timestamp>=0),this._reportProgress(i,W.timestamp+W.duration),await B.add(W,U),this._synchronizer.shouldWait(i,W.timestamp)&&await this._synchronizer.wait(W.timestamp)}B.close(),this._synchronizer.closeTrack(i)})())}let _=null;r.group||(_=new ye);let k=await e.getLanguageCode();this.output.addVideoTrack(o,{frameRate:r.frameRate,languageCode:pt(k)?k:void 0,name:await e.getName()??void 0,disposition:await e.getDisposition(),rotation:c,group:_??r.group}),this._addedCounts.video++,this._totalTrackCount++,this.utilizedTracks.push(e),this._outputTrackIds.push(i),this._outputOwnTrackGroups.push(_)}async _processAudioTrack(e,r,i){let s=await e.getCodec();if(!s){this.discardedTracks.push({track:e,reason:"unknown_source_codec",trackOptions:r});return}let o,n=await e.getNumberOfChannels(),a=await e.getSampleRate(),c=await e.getFirstTimestamp(),l=r.numberOfChannels??n,u=r.sampleRate??a,d=c<this._startTimestamp,f=c>this._startTimestamp&&!this.output.format.supportsTimestampedMediaData,h=this.output.format.getSupportedAudioCodecs();if(!r.forceTranscode&&!r.bitrate&&l===n&&u===a&&!d&&!f&&h.includes(s)&&(!r.codec||r.codec===s)&&!r.process&&r.sampleFormat===void 0){let w=new mi(s);o=w,this._trackPromises.push((async()=>{await this._started;let y=new Ye(e),A={decoderConfig:await e.getDecoderConfig()??void 0};for await(let S of y.packets()){if(this._canceled)return;if(S.timestamp>=this._endTimestamp)break;let T=S.clone({timestamp:S.timestamp-this._startTimestamp});p(T.timestamp>=0),this._reportProgress(i,T.timestamp+T.duration),await w.add(T,A),this._synchronizer.shouldWait(i,T.timestamp)&&await this._synchronizer.wait(T.timestamp)}w.close(),this._synchronizer.closeTrack(i)})())}else{if(!await e.canDecode()){this.discardedTracks.push({track:e,reason:"undecodable_source_codec",trackOptions:r});return}let y=null;r.codec&&(h=h.filter(I=>I===r.codec));let b=r.bitrate??en,A=await tn(h,{numberOfChannels:r.process&&r.processedNumberOfChannels?r.processedNumberOfChannels:l,sampleRate:r.process&&r.processedSampleRate?r.processedSampleRate:u,bitrate:b});if(!A.some(I=>ot.includes(I))&&h.some(I=>ot.includes(I))&&(l!==vn||u!==In)){let _=(await tn(h,{numberOfChannels:vn,sampleRate:In,bitrate:b})).find(k=>ot.includes(k));_&&(y=_,l=vn,u=In)}else y=A[0]??null;if(y===null){this.discardedTracks.push({track:e,reason:"no_encodable_target_codec",trackOptions:r});return}let S={codec:y,bitrate:b,transform:{sampleFormat:r.sampleFormat,process:r.process}};p(S.transform),l!==n&&(S.transform.numberOfChannels=l),u!==a&&(S.transform.sampleRate=u);let T=null;S.onEncodedSample=I=>{T=I.timestamp};let v=new pi(S);o=v,this._trackPromises.push((async()=>{await this._started;let I=new si(e);for await(let _ of I.samples(this._startTimestamp,this._endTimestamp)){if(this._canceled){_.close();return}if(f){let F=c-this._startTimestamp,z=Math.round(F*a),U=ze(_.format),J=new Uint8Array(U*z*n);(_.format==="u8"||_.format==="u8-planar")&&J.fill(2**7);let W=new fe({data:J,format:_.format,numberOfChannels:n,sampleRate:a,timestamp:0});await this._registerAudioSample(W,v,i,()=>T),f=!1}let k=0,B=_.numberOfFrames;if(_.timestamp<this._startTimestamp&&(k=Math.round((this._startTimestamp-_.timestamp)*_.sampleRate)),_.timestamp+_.duration>this._endTimestamp&&(B=Math.round((this._endTimestamp-_.timestamp)*_.sampleRate)),k>0||B<_.numberOfFrames){let F=_.trim(k,B);if(_.close(),_=F,_.numberOfFrames===0){_.close();continue}}_.setTimestamp(_.timestamp-this._startTimestamp),await this._registerAudioSample(_,v,i,()=>T)}v.close(),this._synchronizer.closeTrack(i)})())}let m=null;r.group||(m=new ye);let g=await e.getLanguageCode();this.output.addAudioTrack(o,{languageCode:pt(g)?g:void 0,name:await e.getName()??void 0,disposition:await e.getDisposition(),group:m??r.group}),this._addedCounts.audio++,this._totalTrackCount++,this.utilizedTracks.push(e),this._outputTrackIds.push(i),this._outputOwnTrackGroups.push(m)}async _registerAudioSample(e,r,i,s){this._reportProgress(i,e.timestamp+e.duration),await r.add(e),e.close();let o=s();o!==null&&this._synchronizer.shouldWait(i,o)&&await this._synchronizer.wait(o)}_reportProgress(e,r){if(!this._computeProgress)return;p(this._totalDuration!==null),this._maxTimestamps.set(e,Math.max(r,this._maxTimestamps.get(e)));let i=Math.min(...this._maxTimestamps.values()),s=K(i/this._totalDuration,0,1);s!==this._lastProgress&&(this._lastProgress=s,this.onProgress?.(s,i))}},xi=class extends Error{constructor(e="Conversion has been canceled."){super(e),this.name="ConversionCanceledError"}},Oo=1,Pn=class{constructor(){this.maxTimestamps=new Map,this.resolvers=[]}declareTrack(e){this.maxTimestamps.set(e,0)}shouldWait(e,r){let i=this.maxTimestamps.get(e);p(i!==void 0),this.maxTimestamps.set(e,Math.max(r,i));let s=this.computeMinAndMaybeResolve();return r-s>Oo}wait(e){let{promise:r,resolve:i}=Y();return this.resolvers.push({timestamp:e,resolve:i}),r}closeTrack(e){this.maxTimestamps.delete(e),this.computeMinAndMaybeResolve()}computeMinAndMaybeResolve(){let e=1/0;for(let[,r]of this.maxTimestamps)e=Math.min(e,r);for(let r=0;r<this.resolvers.length;r++){let i=this.resolvers[r];i.timestamp-e<Oo&&(i.resolve(),this.resolvers.splice(r,1),r--)}return e}};/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */var Do=Symbol.for("mediabunny loaded");globalThis[Do]&&M._error(`[WARNING]
Mediabunny was loaded twice. This will likely cause Mediabunny not to work correctly. Check if multiple dependencies are importing different versions of Mediabunny, or if something is being bundled incorrectly.`);globalThis[Do]=!0;async function Oc(t){if(!(t instanceof Blob)||t.size===0)throw new TypeError("A non-empty MP4 Blob is required.");let e=new Et({formats:[Xi],source:new pr(t)});try{let r=new tt,i=new ft({format:new dt({fastStart:"in-memory"}),target:r}),s=await Ir.init({input:e,output:i,tracks:"primary",video:{forceTranscode:!1},audio:{forceTranscode:!1},showWarnings:!1});if(!s.isValid||!s.utilizedTracks.some(o=>o.type==="video"))throw new Error("The MP4 could not be prepared for sharing.");if(await s.execute(),!r.buffer||r.buffer.byteLength===0)throw new Error("The MP4 remux produced no data.");return new Blob([r.buffer],{type:"video/mp4"})}finally{e.dispose()}}globalThis.M4LRecorderMp4Compat=Object.freeze({flattenMp4Blob:Oc});})();

/* M4L v93.7.3
   Shared student/admin recorder interface with validated local image upload and shared manifest caching.
   Records MP4 wherever the browser supports it, otherwise audio plus JPEG.
   Flattens fragmented browser MP4 recordings before preview, Share or Save.
   Uses unified Redo, Share and Save actions. WebM video is never created. */
(() => {
  "use strict";

  const MAX_RECORDING_MS = 2 * 60 * 1000;
  const CANVAS_FPS = 1;
  const OUTPUT_BASENAME = "reader-recording";
  const MANIFEST_URL = "/recorder/pages/manifest.json";
  const PAGE_ASSET_BASE = "/recorder/pages/";
  const RECORDER_MANIFEST_CACHE_KEY = "recorder:manifest:v1";
  const RECORDER_MANIFEST_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  const RECORDER_UPLOAD_MAX_BYTES = 15 * 1024 * 1024;
  const RECORDER_UPLOAD_MAX_PIXELS = 50 * 1000 * 1000;
  const RECORDER_UPLOAD_MIME_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp"
  ]);
  const RECORDER_UPLOAD_EXTENSIONS = new Set(["jpg", "jpeg", "png", "webp"]);

  const state = {
    initialized: false,
    manifestLoaded: false,
    books: [],
    selectedBookId: "",
    pages: [],
    sourceMode: "page",
    selectedPage: null,
    selectedImage: null,
    canvasContext: null,
    mediaRecorder: null,
    audioStream: null,
    canvasStream: null,
    combinedStream: null,
    chunks: [],
    isFinalizing: false,
    startedAt: 0,
    timerId: 0,
    stopTimeoutId: 0,
    frameRefreshId: 0,
    recordingBlob: null,
    recordingFile: null,
    recordingUrl: "",
    pageImageBlob: null,
    pageImageFile: null,
    pageImageUrl: "",
    recordingMode: "",
    resultKind: "",
    forceAudioImage: false,
    selectedMimeType: "",
    actualMimeType: "",
    stopReason: "manual",
    recordingDurationMs: 0,
    outputBaseName: "",
    shareCapabilities: null,
    uploadedObjectUrls: [],
    currentView: "pages"
  };

  const els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function renderRecorderInterface(root) {
    if (!root) return false;

    root.innerHTML = `
      <section id="m4l-recorder-page-select" class="m4l-recorder-view m4l-recorder-view--pages active" aria-labelledby="m4l-recorder-title">
        <h2 id="m4l-recorder-title" class="m4l-recorder-title">Select a lesson to Record</h2>

        <div class="m4l-recorder-book-card">
          <label class="visually-hidden" for="m4l-recorder-book-select">Select a Kitab or recording type</label>
          <select
            id="m4l-recorder-book-select"
            class="m4l-recorder-book-select"
            aria-label="Select a Kitab or recording type"
            aria-describedby="m4l-recorder-selector-label m4l-recorder-upload-limits"
          >
            <option value="">Loading image sets...</option>
          </select>
          <p id="m4l-recorder-selector-label" class="m4l-recorder-selector-label">Select a Kitab</p>
          <p id="m4l-recorder-upload-limits" class="m4l-recorder-upload-limits">Own image: one JPG, PNG or WebP file, up to 15 MB. It stays on this device.</p>
          <input
            id="m4l-recorder-page-upload"
            class="visually-hidden"
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
          />
        </div>

        <p id="m4l-recorder-status" class="m4l-recorder-status helper-text" role="status" aria-live="polite">Loading image sets...</p>
        <div id="m4l-recorder-page-grid" class="m4l-recorder-page-grid" aria-label="Available reader pages"></div>
      </section>

      <section id="m4l-recorder-record-view" class="m4l-recorder-view m4l-recorder-view--record" aria-labelledby="m4l-recorder-record-title">
        <div class="m4l-recorder-view-header m4l-recorder-view-header--clean">
          <h2 id="m4l-recorder-record-title" class="m4l-recorder-view-title">Record</h2>
          <button id="m4l-recorder-back-to-pages" class="m4l-recorder-back-icon-btn" type="button" aria-label="Return to page selector" title="Return to page selector">
            <span class="m4l-recorder-back-icon" aria-hidden="true"></span>
            <span class="m4l-recorder-back-label">Return to page selector</span>
          </button>
        </div>

        <div class="m4l-recorder-reader-frame">
          <canvas id="m4l-recorder-canvas" aria-label="Selected reader page"></canvas>
          <div id="m4l-recorder-audio-stage" class="m4l-recorder-audio-stage" hidden>
            <span class="m4l-recorder-audio-symbol" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>
            <span>Audio only</span>
          </div>
        </div>

        <div class="m4l-recorder-controls" aria-label="Recording controls">
          <div class="m4l-recorder-control-copy">
            <p id="m4l-recorder-helper" class="m4l-recorder-helper helper-text">Microphone permission will be requested when you tap Record.</p>
            <p id="m4l-recorder-recording-status" class="m4l-recorder-recording-status" hidden>
              Recording stops automatically in
              <output id="m4l-recorder-countdown" aria-live="polite">02:00</output>
            </p>
          </div>

          <button id="m4l-recorder-record-btn" class="m4l-recorder-record-action" type="button" aria-label="Start recording">
            <img class="m4l-recorder-native-icon" src="/icons/record.svg?v=93.7.2" alt="" aria-hidden="true" />
            <span class="m4l-recorder-record-label">Record</span>
          </button>

          <button id="m4l-recorder-stop-btn" class="m4l-recorder-record-action" type="button" aria-label="Stop recording" hidden>
            <img class="m4l-recorder-native-icon" src="/icons/stoprecord.svg?v=93.7.2" alt="" aria-hidden="true" />
            <span class="m4l-recorder-record-label">Stop</span>
          </button>
        </div>
      </section>

      <section id="m4l-recorder-preview-view" class="m4l-recorder-view m4l-recorder-view--preview" aria-labelledby="m4l-recorder-preview-title">
        <div class="m4l-recorder-view-header m4l-recorder-view-header--clean">
          <h2 id="m4l-recorder-preview-title" class="m4l-recorder-view-title">Preview</h2>
          <button id="m4l-recorder-preview-pages" class="m4l-recorder-back-icon-btn" type="button" aria-label="Return to page selector" title="Return to page selector">
            <span class="m4l-recorder-back-icon" aria-hidden="true"></span>
            <span class="m4l-recorder-back-label">Return to page selector</span>
          </button>
        </div>

        <div class="m4l-recorder-preview-media">
          <video id="m4l-recorder-preview-video" class="m4l-recorder-preview-video" controls playsinline hidden></video>
          <div id="m4l-recorder-preview-audio-panel" class="m4l-recorder-preview-audio-panel" hidden>
            <img id="m4l-recorder-preview-page-image" class="m4l-recorder-preview-page-image" alt="Selected reader page" hidden />
            <div class="m4l-recorder-audio-player-card">
              <span id="m4l-recorder-preview-audio-label" class="m4l-recorder-audio-player-label">Audio recording</span>
              <audio id="m4l-recorder-preview-audio" controls preload="metadata"></audio>
            </div>
          </div>
        </div>

        <p id="m4l-recorder-recording-meta" class="m4l-recorder-helper helper-text">Review before sharing.</p>

        <div class="m4l-recorder-preview-actions" aria-label="Recording actions">
          <button id="m4l-recorder-rerecord-btn" class="m4l-recorder-preview-action" type="button">
            <img class="m4l-recorder-preview-icon" src="/icons/cancelredo.svg?v=93.7.2" alt="" aria-hidden="true" />
            <span>Redo</span>
          </button>
          <button id="m4l-recorder-share-btn" class="m4l-recorder-preview-action" type="button">
            <img class="m4l-recorder-preview-icon" src="/icons/share.svg?v=93.7.2" alt="" aria-hidden="true" />
            <span id="m4l-recorder-share-label">Share</span>
          </button>
          <button id="m4l-recorder-save-btn" class="m4l-recorder-preview-action" type="button" hidden >
            <img class="m4l-recorder-preview-icon" src="/icons/save.svg?v=93.7.2" alt="" aria-hidden="true" hidden />
         <span hidden>Save</span> 
          </button>
          
        </div>

        <div id="m4l-recorder-save-reminder" class="m4l-recorder-pair-actions" aria-live="polite" hidden>
          <div class="m4l-recorder-pair-action-group">
            <p id="m4l-recorder-save-reminder-text">Your recording files are being saved.</p>
            <div>
              <button id="m4l-recorder-open-whatsapp-btn" class="m4l-recorder-secondary-action" type="button">Open WhatsApp</button>
              <button id="m4l-recorder-dismiss-save-reminder" class="m4l-recorder-secondary-action" type="button">Not now</button>
            </div>
          </div>
        </div>
      </section>
    `;

    return true;
  }

  function cacheElements() {
    els.root = document.querySelector("[data-m4l-recorder-root]");
    if (!els.root) return false;
    renderRecorderInterface(els.root);
    els.pageView = $("m4l-recorder-page-select");
    els.recordView = $("m4l-recorder-record-view");
    els.previewView = $("m4l-recorder-preview-view");
    els.bookSelect = $("m4l-recorder-book-select");
    els.pageUpload = $("m4l-recorder-page-upload");
    els.pageGrid = $("m4l-recorder-page-grid");
    els.status = $("m4l-recorder-status");
    els.canvas = $("m4l-recorder-canvas");
    els.recordTitle = $("m4l-recorder-record-title");
    els.previewTitle = $("m4l-recorder-preview-title");
    els.recordBtn = $("m4l-recorder-record-btn");
    els.stopBtn = $("m4l-recorder-stop-btn");
    els.countdown = $("m4l-recorder-countdown");
    els.helper = $("m4l-recorder-helper");
    els.recordingStatus = $("m4l-recorder-recording-status");
    els.readerFrame = els.canvas && els.canvas.closest(".m4l-recorder-reader-frame");
    els.audioStage = $("m4l-recorder-audio-stage");
    els.previewVideo = $("m4l-recorder-preview-video");
    els.previewAudioPanel = $("m4l-recorder-preview-audio-panel");
    els.previewAudio = $("m4l-recorder-preview-audio");
    els.previewAudioLabel = $("m4l-recorder-preview-audio-label");
    els.previewPageImage = $("m4l-recorder-preview-page-image");
    els.rerecordBtn = $("m4l-recorder-rerecord-btn");
    els.shareBtn = $("m4l-recorder-share-btn");
    els.shareLabel = $("m4l-recorder-share-label");
    els.saveBtn = $("m4l-recorder-save-btn");
    els.saveReminder = $("m4l-recorder-save-reminder");
    els.saveReminderText = $("m4l-recorder-save-reminder-text");
    els.openWhatsappBtn = $("m4l-recorder-open-whatsapp-btn");
    els.dismissSaveReminderBtn = $("m4l-recorder-dismiss-save-reminder");
    els.recordingMeta = $("m4l-recorder-recording-meta");
    els.backToPages = $("m4l-recorder-back-to-pages");
    els.previewPages = $("m4l-recorder-preview-pages");
    return !!(els.root && els.bookSelect && els.pageGrid && els.canvas);
  }

  function setStatus(message, options = {}) {
    if (!els.status) return false;
    els.status.textContent = message || "";
    els.status.classList.toggle("is-error", options.kind === "error");
    return true;
  }

  function isRecorderScreenActive() {
    const screen = document.getElementById("record-lesson-screen");
    return !!(screen && screen.classList.contains("active"));
  }

  function getRecorderHistoryApi() {
    return window.M4LAppHistory || window.M4LShell || null;
  }

  function getRecorderHistoryContext() {
    const pageIndex = state.selectedPage
      ? state.pages.findIndex(page => page && page.id === state.selectedPage.id)
      : -1;

    return {
      sourceMode: state.sourceMode,
      bookId: String(state.selectedBookId || ""),
      pageId: String(state.selectedPage && state.selectedPage.id || ""),
      pageIndex,
      pageTitle: String(state.selectedPage && state.selectedPage.title || "")
    };
  }

  function recordRecorderHistory(viewName, options = {}) {
    if (options.recordHistory === false || !isRecorderScreenActive()) {
      return false;
    }

    const historyApi = getRecorderHistoryApi();
    if (!historyApi) return false;

    if (viewName === "pages") {
      const recordHome = historyApi.recordSectionHome || historyApi.recordAppSectionHome;
      return typeof recordHome === "function"
        ? recordHome("recorder", {
            screenId: "record-lesson-screen",
            replace: options.replace !== false,
            context: {
              view: "pages",
              bookId: String(state.selectedBookId || "")
            }
          })
        : false;
    }

    const recordView = historyApi.recordSectionView || historyApi.recordAppSectionView;
    if (typeof recordView !== "function") return false;

    return recordView("recorder", viewName, {
      screenId: "record-lesson-screen",
      context: getRecorderHistoryContext(),
      nested: options.nested === true,
      replace: options.replace === true
    });
  }

  function showView(viewName, options = {}) {
    const views = {
      pages: els.pageView,
      record: els.recordView,
      preview: els.previewView
    };

    if (!views[viewName]) return false;

    Object.values(views).forEach(view => {
      if (view) view.classList.toggle("active", view === views[viewName]);
    });

    state.currentView = viewName;
    recordRecorderHistory(viewName, options);
    return true;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }

  function isAbsoluteUrl(value) {
    return /^(https?:|blob:|data:|\/)/i.test(String(value || ""));
  }

  function normalizeBookId(book, index) {
    const imageBasePath = String(book.imageBasePath || "").trim().replace(/\\/g, "/").replace(/\/$/, "");
    const explicit = String(book.id || book.bookId || "").trim();
    const folder = String(book.folder || "").trim().replace(/\\/g, "/").replace(/\/$/, "");
    const title = String(book.bookTitle || book.title || book.name || `Image Set ${index + 1}`).trim();
    return explicit || imageBasePath || folder || title || `book-${index + 1}`;
  }

  function resolvePageImagePath(rawImagePath) {
    const cleanPath = String(rawImagePath || "").trim().replace(/\\/g, "/");
    if (!cleanPath) return "";
    if (isAbsoluteUrl(cleanPath)) return cleanPath;
    return `${PAGE_ASSET_BASE}${cleanPath.replace(/^\/+/, "")}`;
  }

  function normalizePage(rawPage, index, book) {
    const pageNo = rawPage.pageNo || rawPage.page || index + 1;
    const lessonNo = rawPage.lesson || rawPage.lessonNo || null;
    const rawImagePath = rawPage.src || rawPage.imageUrl || rawPage.image || rawPage.file || rawPage.filename || "";
    const title = rawPage.title
      || (lessonNo ? `Lesson ${lessonNo}` : "")
      || (rawPage.type === "cover" ? "Cover" : "")
      || `Page ${pageNo}`;
    const src = resolvePageImagePath(rawImagePath);

    if (!src) return null;

    return {
      id: String(rawPage.id || rawPage.pageId || `${book.id}-${pageNo || index + 1}`),
      title: String(title),
      pageNo: Number(pageNo) || index + 1,
      lesson: lessonNo === null ? null : Number(lessonNo),
      type: String(rawPage.type || (lessonNo ? "lesson" : "page")),
      src,
      source: "manifest",
      bookTitle: book.bookTitle
    };
  }

  function normalizeBook(rawBook, index) {
    const bookTitle = String(rawBook.bookTitle || rawBook.title || rawBook.name || `Image Set ${index + 1}`).trim();
    const id = normalizeBookId(rawBook, index);
    const book = {
      ...rawBook,
      id,
      bookTitle,
      pages: []
    };

    const rawPages = Array.isArray(rawBook.pages) ? rawBook.pages : [];
    book.pages = rawPages
      .map((page, pageIndex) => normalizePage(page || {}, pageIndex, book))
      .filter(Boolean);

    return book.pages.length ? book : null;
  }

  function normalizeManifest(manifest) {
    if (manifest && Array.isArray(manifest.books)) {
      return manifest.books
        .map((book, index) => normalizeBook(book || {}, index))
        .filter(Boolean);
    }

    if (manifest && Array.isArray(manifest.pages)) {
      const single = normalizeBook({
        ...manifest,
        id: manifest.id || "default-book",
        bookTitle: manifest.bookTitle || manifest.title || "Reader Pages"
      }, 0);
      return single ? [single] : [];
    }

    return [];
  }

  function getDefaultBookId(manifest, books) {
    const wanted = String(manifest && manifest.defaultBook || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/\/$/, "");
    if (!wanted) return books[0] ? books[0].id : "";

    const match = books.find(book => {
      const candidates = [
        book.id,
        book.bookTitle,
        book.folder,
        book.imageBasePath
      ].map(value => String(value || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/\/$/, ""));

      return candidates.includes(wanted);
    });

    return match ? match.id : (books[0] ? books[0].id : "");
  }

  function renderBookSelector() {
    if (!els.bookSelect) return false;

    els.bookSelect.innerHTML = "";

    if (!state.books.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "No image sets found";
      els.bookSelect.appendChild(option);
    } else {
      state.books.forEach(book => {
        const option = document.createElement("option");
        option.value = book.id;
        option.textContent = book.bookTitle;
        els.bookSelect.appendChild(option);
      });
    }

    const activeUploadedPage = state.selectedBookId === "__upload"
      ? (state.pages[0] || null)
      : null;

    if (activeUploadedPage) {
      const currentUploadOption = document.createElement("option");
      currentUploadOption.value = "__current_upload";
      currentUploadOption.textContent = `Own image · ${activeUploadedPage.title || "Selected image"}`;
      els.bookSelect.appendChild(currentUploadOption);
    }

    const uploadOption = document.createElement("option");
    uploadOption.value = "__upload";
    uploadOption.textContent = activeUploadedPage
      ? "Select another image"
      : "Select your own image";
    els.bookSelect.appendChild(uploadOption);

    const audioOnlyOption = document.createElement("option");
    audioOnlyOption.value = "__audio_only";
    audioOnlyOption.textContent = "Record audio only";
    els.bookSelect.appendChild(audioOnlyOption);

    if (activeUploadedPage) {
      els.bookSelect.value = "__current_upload";
    } else {
      els.bookSelect.value = state.selectedBookId || (state.books[0] ? state.books[0].id : "");
    }

    return true;
  }

  function getSelectedBook() {
    return state.books.find(book => book.id === state.selectedBookId) || null;
  }

  function cleanupUploadedObjectUrls() {
    state.uploadedObjectUrls.forEach(url => {
      try { URL.revokeObjectURL(url); } catch (error) { console.warn("Could not revoke upload URL", error); }
    });
    state.uploadedObjectUrls = [];
  }

  function setBook(bookId) {
    const book = state.books.find(candidate => candidate.id === bookId);
    if (!book) return false;

    cleanupUploadedObjectUrls();
    state.sourceMode = "page";
    state.selectedBookId = book.id;
    state.pages = book.pages;
    state.selectedPage = null;
    state.selectedImage = null;
    renderBookSelector();
    renderPageGrid();
    setStatus(`${book.bookTitle} loaded · ${book.pages.length} pages`);
    showView("pages");
    return true;
  }

  function renderPageGrid() {
    if (!els.pageGrid) return false;
    els.pageGrid.innerHTML = "";

    if (!state.pages.length) {
      const empty = document.createElement("div");
      empty.className = "m4l-recorder-empty-card";
      empty.innerHTML = "No pages loaded yet.<br>Choose an image set, or select your own image.";
      els.pageGrid.appendChild(empty);
      return true;
    }

    state.pages.forEach((page, index) => {
     /* 
     const subtitle = page.type === "cover"
        ? "Cover"
        : page.lesson
          ? `Lesson ${page.lesson}`
          : `Page ${page.pageNo || index + 1}`;
       */
      const button = document.createElement("button");
      button.type = "button";
      button.className = "m4l-recorder-page-card";
      button.dataset.pageIndex = String(index);
      button.setAttribute("aria-label", `Select ${page.title}`);
      
      /*
      button.innerHTML = `
        <span class="m4l-recorder-page-thumb"><img src="${escapeAttribute(page.src)}" alt="" loading="lazy"></span>
        <span class="m4l-recorder-page-title">${escapeHtml(page.title)}</span>
        <span class="m4l-recorder-page-subtitle">${escapeHtml(subtitle)}</span>
      `;
      */
     button.innerHTML = `
  <span class="m4l-recorder-page-thumb">
    <img src="${escapeAttribute(page.src)}" alt="" loading="lazy">
  </span>
  <span class="m4l-recorder-page-title">${escapeHtml(page.title)}</span>
`;
      els.pageGrid.appendChild(button);
    });

    return true;
  }

  async function loadManifest(options = {}) {
    if (state.manifestLoaded && options.force !== true) return true;

    const applyManifest = manifest => {
      const books = normalizeManifest(manifest || {});
      const preserveUploadedPages = state.selectedBookId === "__upload" && state.pages.length > 0;
      const preserveActiveSession = state.currentView !== "pages" || isRecordingActive();

      state.books = books;
      state.manifestLoaded = true;

      if (!books.length) {
        if (preserveUploadedPages || preserveActiveSession) return true;

        state.selectedBookId = "";
        state.pages = [];
        renderBookSelector();
        renderPageGrid();
        setStatus("No books were found in /recorder/pages/manifest.json.", { kind: "error" });
        return false;
      }

      const currentBook = books.find(book => book.id === state.selectedBookId);
      const nextBookId = currentBook
        ? currentBook.id
        : getDefaultBookId(manifest, books);
      const nextBook = books.find(book => book.id === nextBookId) || books[0];

      if (!preserveUploadedPages && nextBook && (!preserveActiveSession || currentBook)) {
        state.selectedBookId = nextBook.id;
        state.pages = nextBook.pages;
      }

      // A shared-cache refresh must not navigate away from a recording or
      // preview, replace an uploaded image, or reveal the selected media mode.
      if (state.currentView === "pages" && !isRecordingActive()) {
        renderBookSelector();
        renderPageGrid();

        if (preserveUploadedPages) {
          setStatus(`Own image loaded · ${state.pages.length} page${state.pages.length === 1 ? "" : "s"}`);
        } else if (nextBook) {
          setStatus(`${nextBook.bookTitle} loaded · ${nextBook.pages.length} pages`);
        }
      }

      return true;
    };

    let freshFetchAttempted = false;
    const fetchFresh = async () => {
      freshFetchAttempted = true;
      const manifestUrl = `${MANIFEST_URL}?t=${Date.now()}`;
      const response = await fetch(manifestUrl, { cache: "no-store" });
      if (!response.ok) throw new Error(`Manifest request failed: ${response.status}`);
      return response.json();
    };

    try {
      const cached = window.M4LCache && window.M4LCache.getEntry(RECORDER_MANIFEST_CACHE_KEY, {
        scope: "shared",
        ttl: RECORDER_MANIFEST_CACHE_TTL_MS,
        allowStale: true
      });

      if (!cached || options.force === true) setStatus("Loading image sets...");

      if (!window.M4LCache) {
        return applyManifest(await fetchFresh());
      }

      const manifest = await window.M4LCache.getOrFetch(RECORDER_MANIFEST_CACHE_KEY, fetchFresh, {
        scope: "shared",
        ttl: RECORDER_MANIFEST_CACHE_TTL_MS,
        force: options.force === true,
        background: options.force !== true,
        onCached: applyManifest,
        onUpdate: fresh => applyManifest(fresh)
      });

      if (!cached || options.force === true) return applyManifest(manifest);
      return true;
    } catch (error) {
      // If the shared cache itself is unavailable, retain the recorder's
      // original direct-fetch path before showing a terminal load error.
      if (window.M4LCache && !freshFetchAttempted) {
        try {
          return applyManifest(await fetchFresh());
        } catch (fallbackError) {
          console.error("Recorder manifest cache and direct fetch both failed", error, fallbackError);
        }
      } else {
        console.error("Recorder manifest could not be loaded", error);
      }

      const hasUsableRecorderState = Boolean(
        state.books.length ||
        state.pages.length ||
        state.selectedPage ||
        state.sourceMode === "audio-only"
      );

      if (hasUsableRecorderState) {
        if (state.currentView === "pages" && !isRecordingActive()) {
          setStatus("Image sets could not be refreshed. Using the available pages.", { kind: "error" });
        }
        return false;
      }

      state.books = [];
      state.selectedBookId = "";
      state.pages = [];
      renderBookSelector();
      renderPageGrid();
      setStatus("Could not load /recorder/pages/manifest.json. Check that the file is deployed at that exact path.", { kind: "error" });
      return false;
    }
  }

  function getRecorderUploadExtension(fileName) {
    const match = String(fileName || "").trim().toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1] : "";
  }

  function getRecorderUploadValidationMessage(file) {
    if (!file) {
      return "No image was selected.";
    }

    if (!Number.isFinite(file.size) || file.size <= 0) {
      return "This image file is empty. Choose a JPG, PNG or WebP image.";
    }

    if (file.size > RECORDER_UPLOAD_MAX_BYTES) {
      return "This image is larger than 15 MB. Choose a smaller JPG, PNG or WebP image.";
    }

    const mimeType = String(file.type || "").trim().toLowerCase();
    const extension = getRecorderUploadExtension(file.name);
    const acceptedMimeType = mimeType ? RECORDER_UPLOAD_MIME_TYPES.has(mimeType) : false;
    const acceptedExtension = RECORDER_UPLOAD_EXTENSIONS.has(extension);

    if (!acceptedMimeType && !acceptedExtension) {
      return "Unsupported image format. Choose one JPG, PNG or WebP image.";
    }

    if (mimeType && !RECORDER_UPLOAD_MIME_TYPES.has(mimeType)) {
      return "Unsupported image format. Choose one JPG, PNG or WebP image.";
    }

    return "";
  }

  function resetRecorderUploadInput() {
    if (els.pageUpload) {
      els.pageUpload.value = "";
    }
    return true;
  }

  function getRecorderUploadReadyStatus(file) {
    const sizeMb = Math.max(0.01, Number(file && file.size || 0) / (1024 * 1024));
    const formattedSize = sizeMb < 1 ? `${Math.round(sizeMb * 1024)} KB` : `${sizeMb.toFixed(1)} MB`;
    return `Own image ready · ${formattedSize} · kept on this device`;
  }

  async function addUploadedImage(file) {
    const validationMessage = getRecorderUploadValidationMessage(file);

    if (validationMessage) {
      renderBookSelector();
      setStatus(validationMessage, { kind: "error" });
      alert(validationMessage);
      return false;
    }

    setStatus("Checking your image...");

    const objectUrl = URL.createObjectURL(file);
    let decodedImage = null;

    try {
      decodedImage = await loadImage(objectUrl);

      const naturalWidth = Number(decodedImage.naturalWidth || decodedImage.width || 0);
      const naturalHeight = Number(decodedImage.naturalHeight || decodedImage.height || 0);
      const pixelCount = naturalWidth * naturalHeight;

      if (!naturalWidth || !naturalHeight) {
        throw new Error("The selected image has no readable dimensions.");
      }

      if (pixelCount > RECORDER_UPLOAD_MAX_PIXELS) {
        throw new Error("The selected image is too large to prepare safely on this device.");
      }

      // Commit only after validation and decoding succeed. This preserves the
      // current uploaded page when a replacement file is cancelled or invalid.
      cleanupUploadedObjectUrls();
      state.uploadedObjectUrls = [objectUrl];

      const page = {
        id: `upload-${Date.now()}`,
        title: String(file.name || "Own image").replace(/\.[^.]+$/, "") || "Own image",
        pageNo: 1,
        lesson: null,
        type: "upload",
        src: objectUrl,
        source: "upload",
        bookTitle: "Own image"
      };

      state.sourceMode = "page";
      state.selectedBookId = "__upload";
      state.pages = [page];
      state.selectedPage = page;
      state.selectedImage = decodedImage;

      renderBookSelector();
      renderPageGrid();
      updateSelectedPageTitles(page);
      drawSelectedPage();
      resetTimer();
      updateRecordStage();
      setStatus(getRecorderUploadReadyStatus(file));
      showView("record");
      return true;
    } catch (error) {
      try { URL.revokeObjectURL(objectUrl); } catch (revokeError) { console.warn("Could not revoke rejected upload URL", revokeError); }

      console.error("Recorder image upload failed", error);
      renderBookSelector();

      const message = error && /too large/i.test(String(error.message || ""))
        ? "This image is too large to prepare on this device. Choose a smaller JPG, PNG or WebP image."
        : "This image could not be opened. Choose one JPG, PNG or WebP image up to 15 MB.";

      setStatus(message, { kind: "error" });
      alert(message);
      return false;
    }
  }

  async function handleUploadedImageSelection(fileList) {
    const files = Array.from(fileList || []);

    try {
      if (!files.length) {
        renderBookSelector();
        return false;
      }

      return await addUploadedImage(files[0]);
    } finally {
      // Allows the same file to be selected again after Cancel, Redo or error.
      resetRecorderUploadInput();
    }
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Could not load selected image."));
      image.crossOrigin = "anonymous";
      image.src = src;
    });
  }

  function drawSelectedPage() {
    const image = state.selectedImage;
    if (!image || !els.canvas) return false;

    const maxWidth = 1440;
    const maxHeight = 1920;
    const ratio = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight, 1);
    const width = Math.max(1, Math.round(image.naturalWidth * ratio));
    const height = Math.max(1, Math.round(image.naturalHeight * ratio));

    els.canvas.width = width;
    els.canvas.height = height;
    state.canvasContext = els.canvas.getContext("2d", { alpha: false });
    state.canvasContext.fillStyle = "#ffffff";
    state.canvasContext.fillRect(0, 0, width, height);
    state.canvasContext.drawImage(image, 0, 0, width, height);
    return true;
  }

  function updateRecordStage() {
    const audioOnly = state.sourceMode === "audio-only";
    if (els.canvas) els.canvas.hidden = audioOnly;
    if (els.audioStage) els.audioStage.hidden = !audioOnly;
    if (els.readerFrame) {
      els.readerFrame.classList.toggle("is-audio-only", audioOnly);
    }
    return true;
  }

  function selectAudioOnly() {
    if (isRecordingActive()) {
      alert("Stop the recording before changing recording type.");
      return false;
    }

    cleanup({ keepPages: true, keepSourceMode: false });
    state.sourceMode = "audio-only";
    state.selectedPage = null;
    state.selectedImage = null;
    if (els.recordTitle) els.recordTitle.textContent = "Audio only";
    if (els.previewTitle) els.previewTitle.textContent = "Preview · Audio only";
    if (els.helper) els.helper.textContent = "Microphone permission will be requested when you tap Record.";
    updateRecordStage();
    resetTimer();
    setStatus("Ready");
    showView("record");
    return true;
  }

  async function selectPage(pageIndex) {
    const page = state.pages[pageIndex];
    if (!page) return false;

    setStatus("Loading page...");
    state.sourceMode = "page";
    state.selectedPage = page;
    state.selectedImage = await loadImage(page.src);
    drawSelectedPage();
    resetTimer();

    const title = `${page.bookTitle ? `${page.bookTitle} · ` : ""}${page.title}`;
    if (els.recordTitle) els.recordTitle.textContent = title;
    if (els.previewTitle) els.previewTitle.textContent = `Preview · ${page.title}`;

    updateRecordStage();
    setStatus("Ready");
    showView("record");
    return true;
  }

  function updateSelectedPageTitles(page) {
    if (!page) return false;

    const title = `${page.bookTitle ? `${page.bookTitle} · ` : ""}${page.title}`;
    if (els.recordTitle) els.recordTitle.textContent = title;
    if (els.previewTitle) els.previewTitle.textContent = `Preview · ${page.title}`;
    return true;
  }

  async function restoreSelectedPageFromHistory(context = {}) {
    if (String(context.sourceMode || "") === "audio-only") {
      state.sourceMode = "audio-only";
      state.selectedPage = null;
      state.selectedImage = null;
      if (els.recordTitle) els.recordTitle.textContent = "Audio only";
      if (els.previewTitle) els.previewTitle.textContent = "Preview · Audio only";
      updateRecordStage();
      resetTimer();
      setStatus("Ready");
      return true;
    }

    state.sourceMode = "page";
    const requestedBookId = String(context.bookId || "");
    const requestedPageId = String(context.pageId || "");
    const requestedPageIndex = Number(context.pageIndex);

    if (requestedBookId && requestedBookId !== state.selectedBookId) {
      const requestedBook = state.books.find(book => String(book.id || "") === requestedBookId);
      if (requestedBook) {
        state.selectedBookId = requestedBook.id;
        state.pages = requestedBook.pages;
        renderBookSelector();
        renderPageGrid();
      }
    }

    let page = requestedPageId
      ? state.pages.find(candidate => String(candidate && candidate.id || "") === requestedPageId)
      : null;

    if (!page && Number.isInteger(requestedPageIndex) && requestedPageIndex >= 0) {
      page = state.pages[requestedPageIndex] || null;
    }

    if (!page && state.selectedPage) {
      page = state.selectedPage;
    }

    if (!page) {
      return false;
    }

    state.selectedPage = page;

    if (!state.selectedImage || state.selectedImage.src !== page.src) {
      state.selectedImage = await loadImage(page.src);
    }

    drawSelectedPage();
    updateRecordStage();
    resetTimer();
    updateSelectedPageTitles(page);
    setStatus("Ready");
    return true;
  }

  function isRecordingActive() {
    return state.isFinalizing || !!(
      state.mediaRecorder &&
      state.mediaRecorder.state === "recording"
    );
  }

  async function restoreHistoryState(payload = {}) {
    const viewId = String(payload.viewId || "pages");
    const context = payload.context || {};

    if (viewId !== "record" && isRecordingActive()) {
      alert("Stop the recording before leaving this page.");
      return false;
    }

    if (viewId === "pages" || viewId === "home") {
      cleanup({ keepPages: true });
      renderBookSelector();
      showView("pages", { recordHistory: false });
      return true;
    }

    if (viewId === "record") {
      const restored = await restoreSelectedPageFromHistory(context);
      if (!restored) {
        showView("pages", { recordHistory: false });
        return true;
      }

      showView("record", { recordHistory: false });
      return true;
    }

    if (viewId === "preview") {
      const restored = await restoreSelectedPageFromHistory(context);
      if (!restored || !state.recordingFile || !state.recordingUrl) {
        return false;
      }

      renderResultPreview();
      showView("preview", { recordHistory: false });
      return true;
    }

    showView("pages", { recordHistory: false });
    return true;
  }

  function formatTime(msRemaining) {
    const totalSeconds = Math.max(0, Math.ceil(msRemaining / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function resetTimer() {
    if (els.countdown) els.countdown.textContent = formatTime(MAX_RECORDING_MS);
  }

  function clearTimers() {
    if (state.timerId) window.clearInterval(state.timerId);
    if (state.stopTimeoutId) window.clearTimeout(state.stopTimeoutId);
    if (state.frameRefreshId) window.clearInterval(state.frameRefreshId);
    state.timerId = 0;
    state.stopTimeoutId = 0;
    state.frameRefreshId = 0;
  }

  function updateTimer() {
    if (!state.startedAt) {
      resetTimer();
      return;
    }

    const elapsed = Date.now() - state.startedAt;
    const remaining = MAX_RECORDING_MS - elapsed;
    if (els.countdown) els.countdown.textContent = formatTime(remaining);

    if (remaining <= 0) {
      stopRecording("limit");
    }
  }

  function isIOSDevice() {
    const userAgent = String(navigator.userAgent || "");
    const platform = String(navigator.platform || "");
    return /iPad|iPhone|iPod/i.test(userAgent)
      || (platform === "MacIntel" && navigator.maxTouchPoints > 1);
  }

  function getSupportedMp4MimeType() {
    if (typeof MediaRecorder === "undefined") return "";
    if (typeof MediaRecorder.isTypeSupported !== "function") {
      return isIOSDevice() ? "video/mp4" : "";
    }

    const candidates = [
      "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
      "video/mp4;codecs=avc1,mp4a.40.2",
      "video/mp4;codecs=h264,aac",
      "video/mp4"
    ];

    return candidates.find(type => MediaRecorder.isTypeSupported(type)) || "";
  }

  function getSupportedAudioMimeType() {
    if (typeof MediaRecorder === "undefined") return "";
    if (typeof MediaRecorder.isTypeSupported !== "function") {
      return isIOSDevice() ? "audio/mp4" : "";
    }

    const iosCandidates = [
      "audio/mp4;codecs=mp4a.40.2",
      "audio/mp4"
    ];

    const androidAndOtherCandidates = [
      "audio/mp4;codecs=mp4a.40.2",
      "audio/mp4",
      "audio/webm;codecs=opus",
      "audio/webm"
    ];

    const candidates = isIOSDevice() ? iosCandidates : androidAndOtherCandidates;
    return candidates.find(type => MediaRecorder.isTypeSupported(type)) || "";
  }

  function redrawRecordingFrame(videoTrack) {
    if (!state.selectedImage || !els.canvas || !state.canvasContext) return false;

    const width = els.canvas.width;
    const height = els.canvas.height;
    if (!width || !height) return false;

    state.canvasContext.fillStyle = "#ffffff";
    state.canvasContext.fillRect(0, 0, width, height);
    state.canvasContext.drawImage(state.selectedImage, 0, 0, width, height);

    if (videoTrack && typeof videoTrack.requestFrame === "function") {
      try {
        videoTrack.requestFrame();
      } catch (error) {
        console.warn("Could not request a canvas frame", error);
      }
    }

    return true;
  }

  function getFileExtension(mimeType, resultKind) {
    const cleanType = String(mimeType || "").toLowerCase();
    if (resultKind === "video-mp4") return "mp4";
    if (cleanType.includes("mp4")) return "m4a";
    if (cleanType.includes("ogg")) return "ogg";
    if (cleanType.includes("wav")) return "wav";
    if (cleanType.includes("mpeg")) return "mp3";
    return "webm";
  }

  function getPortableFileMimeType(mimeType, resultKind) {
    const cleanType = String(mimeType || "")
      .toLowerCase()
      .split(";", 1)[0]
      .trim();

    if (resultKind === "video-mp4") return "video/mp4";
    if (cleanType === "audio/mp4") return "audio/mp4";
    if (cleanType.startsWith("audio/")) return cleanType;
    return resultKind === "audio-only" || resultKind === "audio-image"
      ? "audio/webm"
      : cleanType || "application/octet-stream";
  }

  function cleanObjectUrl(url) {
    if (!url) return;
    try { URL.revokeObjectURL(url); } catch (error) { console.warn("Could not revoke object URL", error); }
  }

  function stopTracks(stream) {
    if (!stream) return;
    stream.getTracks().forEach(track => track.stop());
  }

  function safeFilePart(value, fallback = "recording") {
    return String(value || fallback)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || fallback;
  }

  function createOutputBaseName() {
    const now = new Date();
    const pad = value => String(value).padStart(2, "0");
    const timestamp = [
      now.getFullYear(),
      pad(now.getMonth() + 1),
      pad(now.getDate())
    ].join("") + `-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const safeTitle = state.sourceMode === "audio-only"
      ? "audio"
      : safeFilePart(state.selectedPage && state.selectedPage.title, "page");
    return `${OUTPUT_BASENAME}-${safeTitle}-${timestamp}`;
  }

  function canvasToJpegBlob(canvas, quality = 0.9) {
    return new Promise((resolve, reject) => {
      if (!canvas || typeof canvas.toBlob !== "function") {
        reject(new Error("Could not create the page image."));
        return;
      }

      canvas.toBlob(blob => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Could not create the page image."));
        }
      }, "image/jpeg", quality);
    });
  }

  async function preparePageImageFile() {
    if (!state.selectedImage || !els.canvas) {
      throw new Error("No page is available for the image.");
    }

    drawSelectedPage();
    const imageBlob = await canvasToJpegBlob(els.canvas);
    const fileName = `${state.outputBaseName || createOutputBaseName()}.jpg`;

    cleanObjectUrl(state.pageImageUrl);
    state.pageImageBlob = imageBlob;
    state.pageImageFile = new File([imageBlob], fileName, { type: "image/jpeg" });
    state.pageImageUrl = URL.createObjectURL(imageBlob);
    return state.pageImageFile;
  }

  function readMp4BoxType(bytes) {
    return String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);
  }

  async function hasTopLevelMp4Box(blob, requestedType) {
    if (!(blob instanceof Blob) || blob.size < 8) return false;

    let offset = 0;
    let boxCount = 0;
    while (offset + 8 <= blob.size && boxCount < 10000) {
      const headerBuffer = await blob.slice(offset, Math.min(blob.size, offset + 16)).arrayBuffer();
      const bytes = new Uint8Array(headerBuffer);
      const view = new DataView(headerBuffer);
      if (bytes.byteLength < 8) return false;

      let boxSize = view.getUint32(0, false);
      let headerSize = 8;
      if (boxSize === 1) {
        if (bytes.byteLength < 16) return false;
        boxSize = view.getUint32(8, false) * 4294967296 + view.getUint32(12, false);
        headerSize = 16;
      } else if (boxSize === 0) {
        boxSize = blob.size - offset;
      }

      if (!Number.isSafeInteger(boxSize) || boxSize < headerSize || offset + boxSize > blob.size) {
        return false;
      }
      if (readMp4BoxType(bytes) === requestedType) return true;

      offset += boxSize;
      boxCount += 1;
    }

    return false;
  }

  async function preparePortableMp4Blob(blob) {
    const isFragmented = await hasTopLevelMp4Box(blob, "moof");
    if (!isFragmented) return blob;

    const remuxer = globalThis.M4LRecorderMp4Compat;
    if (!remuxer || typeof remuxer.flattenMp4Blob !== "function") {
      throw new Error("MP4 compatibility processing is unavailable.");
    }

    const flattenedBlob = await remuxer.flattenMp4Blob(blob);
    if (!(flattenedBlob instanceof Blob) || !flattenedBlob.size) {
      throw new Error("The compatible MP4 was empty.");
    }
    if (await hasTopLevelMp4Box(flattenedBlob, "moof")) {
      throw new Error("The MP4 remained fragmented after processing.");
    }

    return flattenedBlob;
  }

  function buildVideoRecorder(mimeType) {
    if (!els.canvas || typeof els.canvas.captureStream !== "function") {
      throw new Error("Canvas recording is not available.");
    }

    state.canvasStream = els.canvas.captureStream(CANVAS_FPS);
    const canvasVideoTrack = state.canvasStream.getVideoTracks()[0];
    if (!canvasVideoTrack || canvasVideoTrack.readyState !== "live") {
      throw new Error("The page video track is not available.");
    }

    state.combinedStream = new MediaStream([
      canvasVideoTrack,
      ...state.audioStream.getAudioTracks()
    ]);
    state.selectedMimeType = mimeType;
    const recorder = new MediaRecorder(state.combinedStream, { mimeType });
    if (recorder.mimeType && !String(recorder.mimeType).toLowerCase().includes("mp4")) {
      throw new Error("The browser did not accept MP4 recording.");
    }
    return { recorder, canvasVideoTrack };
  }

  function buildAudioRecorder(mode) {
    state.recordingMode = mode;
    state.selectedMimeType = getSupportedAudioMimeType();

    if (state.selectedMimeType) {
      try {
        return new MediaRecorder(state.audioStream, { mimeType: state.selectedMimeType });
      } catch (error) {
        console.warn("Preferred audio format was unavailable at start; using browser default.", error);
      }
    }

    state.selectedMimeType = "";
    return new MediaRecorder(state.audioStream);
  }

  function configureRecorder(recorder) {
    state.mediaRecorder = recorder;
    state.chunks = [];
    state.actualMimeType = "";

    recorder.ondataavailable = event => {
      if (event.data && event.data.size > 0) {
        state.chunks.push(event.data);
        if (!state.actualMimeType && event.data.type) {
          state.actualMimeType = event.data.type;
        }
      }
    };
    recorder.onstop = () => {
      void finalizeRecording();
    };
    recorder.onerror = event => {
      console.error("Recorder error", event.error || event);
      stopRecording("error");
    };
  }

  function setRecordingUi(active) {
    if (els.recordBtn) els.recordBtn.hidden = active;
    if (els.stopBtn) {
      els.stopBtn.hidden = !active;
      els.stopBtn.disabled = false;
    }
    if (els.recordingStatus) els.recordingStatus.hidden = !active;
    if (!active) resetTimer();
  }

  async function startRecording() {
    const audioOnly = state.sourceMode === "audio-only";

    if (!audioOnly && !state.selectedImage) {
      alert("Select a page before recording.");
      return;
    }

    if (typeof MediaRecorder === "undefined") {
      alert("This browser does not support recording. Please try a newer Safari or Chrome browser.");
      return;
    }

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
      alert("This browser cannot access the microphone for recording.");
      return;
    }

    try {
      cleanup({
        keepPages: true,
        keepSelectedPage: !audioOnly,
        keepSourceMode: true
      });
      state.outputBaseName = createOutputBaseName();
      updateRecordStage();
      if (!audioOnly) drawSelectedPage();

      if (els.helper) els.helper.textContent = "Allow microphone access if prompted.";
      if (els.recordBtn) els.recordBtn.disabled = true;

      state.audioStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      let recorder;
      let canvasVideoTrack = null;
      const mp4MimeType = audioOnly || state.forceAudioImage ? "" : getSupportedMp4MimeType();

      if (!audioOnly && mp4MimeType && els.canvas && typeof els.canvas.captureStream === "function") {
        try {
          state.recordingMode = "video-mp4";
          const videoSetup = buildVideoRecorder(mp4MimeType);
          recorder = videoSetup.recorder;
          canvasVideoTrack = videoSetup.canvasVideoTrack;
          configureRecorder(recorder);
          recorder.start(1000);
        } catch (error) {
          console.warn("MP4 page recording was unavailable; continuing with audio and page image.", error);
          state.forceAudioImage = true;
          if (recorder) {
            recorder.ondataavailable = null;
            recorder.onstop = null;
            recorder.onerror = null;
          }
          stopTracks(state.canvasStream);
          state.canvasStream = null;
          state.combinedStream = null;
          state.chunks = [];
          await preparePageImageFile();
          recorder = buildAudioRecorder("audio-image");
          configureRecorder(recorder);
          recorder.start(1000);
        }
      } else {
        if (!audioOnly) await preparePageImageFile();
        recorder = buildAudioRecorder(audioOnly ? "audio-only" : "audio-image");
        configureRecorder(recorder);
        recorder.start(1000);
      }

      state.startedAt = Date.now();
      state.stopReason = "manual";

      if (state.recordingMode === "video-mp4" && canvasVideoTrack) {
        redrawRecordingFrame(canvasVideoTrack);
        state.frameRefreshId = window.setInterval(() => {
          redrawRecordingFrame(canvasVideoTrack);
        }, 1000);
      }

      if (els.helper) els.helper.textContent = "";
      if (els.recordBtn) els.recordBtn.disabled = false;
      setRecordingUi(true);
      updateTimer();
      state.timerId = window.setInterval(updateTimer, 250);
      state.stopTimeoutId = window.setTimeout(() => stopRecording("limit"), MAX_RECORDING_MS + 250);
    } catch (error) {
      console.error(error);
      cleanup({
        keepPages: true,
        keepSelectedPage: !audioOnly,
        keepSourceMode: true
      });
      if (els.recordBtn) els.recordBtn.disabled = false;
      alert(error && error.name === "NotAllowedError"
        ? "Microphone permission was not allowed. Please allow microphone access to record."
        : error && /page image/i.test(String(error.message || ""))
          ? "The selected page could not be prepared for recording."
          : "Recording could not start on this device/browser.");
    }
  }

  function stopRecording(reason = "manual") {
    clearTimers();
    if (!state.mediaRecorder || state.mediaRecorder.state === "inactive") return;

    state.stopReason = reason;
    if (els.stopBtn) els.stopBtn.disabled = true;
    if (els.helper) els.helper.textContent = reason === "limit" ? "Two-minute limit reached." : "Preparing preview...";

    try {
      state.mediaRecorder.stop();
    } catch (error) {
      console.error("Could not stop recorder", error);
      void finalizeRecording();
    }
  }

  async function finalizeRecording() {
    if (state.isFinalizing) return;
    state.isFinalizing = true;

    clearTimers();
    const recorderMimeType = state.mediaRecorder && state.mediaRecorder.mimeType;
    const durationMs = state.startedAt ? Date.now() - state.startedAt : 0;
    const resultKind = state.recordingMode;
    state.startedAt = 0;

    try {
      stopTracks(state.audioStream);
      stopTracks(state.canvasStream);
      stopTracks(state.combinedStream);
      state.audioStream = null;
      state.canvasStream = null;
      state.combinedStream = null;
      state.mediaRecorder = null;

      setRecordingUi(false);
      if (els.recordBtn) els.recordBtn.disabled = true;

      if (state.stopReason === "error") {
        if (resultKind === "video-mp4") state.forceAudioImage = true;
        cleanup({
          keepPages: true,
          keepSelectedPage: state.sourceMode === "page",
          keepSourceMode: true
        });
        if (els.helper) els.helper.textContent = "Please record again.";
        alert("The recording could not be completed on this device. Please record again.");
        return;
      }

      const fallbackMimeType = resultKind === "video-mp4"
        ? "video/mp4"
        : isIOSDevice()
          ? "audio/mp4"
          : "audio/webm";
      const mimeType = state.actualMimeType || recorderMimeType || state.selectedMimeType || fallbackMimeType;
      if (resultKind === "video-mp4" && !String(mimeType).toLowerCase().includes("mp4")) {
        state.forceAudioImage = true;
        cleanup({
          keepPages: true,
          keepSelectedPage: true,
          keepSourceMode: true
        });
        if (els.helper) els.helper.textContent = "Please record again.";
        alert("This device did not create a compatible recording. Please try again.");
        return;
      }

      let recordingBlob = new Blob(state.chunks, { type: mimeType });
      if (!recordingBlob.size) {
        cleanup({
          keepPages: true,
          keepSelectedPage: state.sourceMode === "page",
          keepSourceMode: true
        });
        if (els.helper) els.helper.textContent = "No audio was captured. Please try again.";
        alert("No recording was captured. Please try again.");
        return;
      }

      if (resultKind === "video-mp4") {
        if (els.helper) els.helper.textContent = "Preparing preview...";
        recordingBlob = await preparePortableMp4Blob(recordingBlob);
      }

      state.chunks = [];
      state.recordingBlob = recordingBlob;
      const extension = getFileExtension(mimeType, resultKind);
      const fileName = `${state.outputBaseName || createOutputBaseName()}.${extension}`;
      const fileMimeType = getPortableFileMimeType(mimeType, resultKind);

      cleanObjectUrl(state.recordingUrl);
      state.recordingUrl = URL.createObjectURL(state.recordingBlob);
      state.recordingFile = new File([state.recordingBlob], fileName, { type: fileMimeType });
      state.resultKind = resultKind;
      state.recordingDurationMs = durationMs;
      state.shareCapabilities = evaluateShareCapabilities();
      state.isFinalizing = false;

      renderResultPreview();
      showView("preview", { nested: true });
    } catch (error) {
      console.error("Recording compatibility preparation failed", error);
      if (resultKind === "video-mp4") state.forceAudioImage = true;
      cleanup({
        keepPages: true,
        keepSelectedPage: state.sourceMode === "page",
        keepSourceMode: true
      });
      if (els.helper) els.helper.textContent = "Please record again.";
      alert("This recording could not be prepared for sharing. Please record again.");
    } finally {
      state.isFinalizing = false;
    }
  }

  function resetPreviewMedia() {
    if (els.previewVideo) {
      els.previewVideo.pause();
      els.previewVideo.hidden = true;
      els.previewVideo.removeAttribute("src");
      els.previewVideo.load();
    }
    if (els.previewAudio) {
      els.previewAudio.pause();
      els.previewAudio.removeAttribute("src");
      els.previewAudio.load();
    }
    if (els.previewAudioPanel) els.previewAudioPanel.hidden = true;
    if (els.previewPageImage) {
      els.previewPageImage.hidden = true;
      els.previewPageImage.removeAttribute("src");
    }
  }

  function canShareFiles(files) {
    if (!navigator.share) return false;
    if (!navigator.canShare) return null;
    try {
      return navigator.canShare({ files });
    } catch (error) {
      console.warn("Could not preflight file sharing.", error);
      return null;
    }
  }

  function getResultFiles() {
    if (!state.recordingFile) return [];
    if (state.resultKind === "audio-image") {
      return [state.pageImageFile, state.recordingFile].filter(Boolean);
    }
    return [state.recordingFile];
  }

  function evaluateShareCapabilities() {
    const files = getResultFiles();
    return { result: files.length ? canShareFiles(files) : false };
  }

  function updateResultActions() {
    const capabilities = state.shareCapabilities || evaluateShareCapabilities();
    state.shareCapabilities = capabilities;

    if (els.shareBtn) {
      els.shareBtn.hidden = false;
      els.shareBtn.disabled = capabilities.result === false;
      if (capabilities.result === false) {
        els.shareBtn.title = "Native file sharing is unavailable. Use Save.";
        els.shareBtn.setAttribute("aria-label", "Share unavailable; use Save");
      } else {
        els.shareBtn.removeAttribute("title");
        els.shareBtn.setAttribute("aria-label", "Share recording");
      }
    }
    if (els.shareLabel) els.shareLabel.textContent = "Share";
    if (els.saveBtn) els.saveBtn.disabled = getResultFiles().length === 0;
  }

  function renderResultPreview() {
    resetPreviewMedia();
    hideSaveReminder();
    const seconds = Math.min(120, Math.max(0, Math.round(state.recordingDurationMs / 1000)));
    const pageTitle = state.selectedPage ? state.selectedPage.title : "Audio recording";

    if (state.resultKind === "video-mp4") {
      if (els.previewVideo) {
        els.previewVideo.src = state.recordingUrl;
        els.previewVideo.hidden = false;
      }
    } else {
      if (els.previewAudioPanel) {
        els.previewAudioPanel.hidden = false;
        els.previewAudioPanel.classList.toggle("is-audio-only", state.resultKind === "audio-only");
      }
      if (els.previewAudio) {
        els.previewAudio.src = state.recordingUrl;
        els.previewAudio.load();
      }
      if (els.previewAudioLabel) {
        els.previewAudioLabel.textContent = state.resultKind === "audio-only" ? "Audio recording" : "Page reading";
      }
      if (state.resultKind === "audio-image" && els.previewPageImage) {
        els.previewPageImage.src = state.pageImageUrl;
        els.previewPageImage.hidden = false;
      }
    }

    if (els.previewTitle) {
      els.previewTitle.textContent = state.resultKind === "audio-only"
        ? "Preview · Audio only"
        : `Preview · ${pageTitle}`;
    }
    if (els.recordingMeta) {
      els.recordingMeta.textContent = `${pageTitle} · ${seconds} seconds`;
    }
    updateResultActions();
  }

  function cleanup(options = {}) {
    clearTimers();
    if (state.mediaRecorder && state.mediaRecorder.state !== "inactive") {
      state.mediaRecorder.ondataavailable = null;
      state.mediaRecorder.onstop = null;
      state.mediaRecorder.onerror = null;
      try { state.mediaRecorder.stop(); } catch (error) { console.warn("Could not cancel recorder.", error); }
    }
    stopTracks(state.audioStream);
    stopTracks(state.canvasStream);
    stopTracks(state.combinedStream);
    state.audioStream = null;
    state.canvasStream = null;
    state.combinedStream = null;
    state.mediaRecorder = null;
    state.chunks = [];
    state.isFinalizing = false;
    state.startedAt = 0;
    state.selectedMimeType = "";
    state.actualMimeType = "";
    state.recordingMode = "";
    state.stopReason = "manual";
    state.shareCapabilities = null;

    if (!options.keepRecordingFile) {
      cleanObjectUrl(state.recordingUrl);
      cleanObjectUrl(state.pageImageUrl);
      state.recordingUrl = "";
      state.recordingBlob = null;
      state.recordingFile = null;
      state.pageImageUrl = "";
      state.pageImageBlob = null;
      state.pageImageFile = null;
      state.resultKind = "";
      state.recordingDurationMs = 0;
      state.outputBaseName = "";
      resetPreviewMedia();
      hideSaveReminder();
    }

    if (!options.keepSelectedPage) {
      state.selectedPage = null;
      state.selectedImage = null;
      state.currentView = "pages";
    }
    if (!options.keepSourceMode) state.sourceMode = "page";

    if (els.recordBtn) els.recordBtn.disabled = false;
    setRecordingUi(false);
    updateRecordStage();
    if (els.helper) els.helper.textContent = "Microphone permission will be requested when you tap Record.";
  }

  async function shareFiles(files) {
    if (!files.length || !navigator.share) throw new Error("File sharing is unavailable.");
    await navigator.share({ files });
  }

  async function shareRecording() {
    const files = getResultFiles();
    if (!files.length) {
      alert("No recording is ready to share.");
      return;
    }

    const capability = canShareFiles(files);
    if (capability === false) {
      state.shareCapabilities = { result: false };
      updateResultActions();
      alert("Native sharing is unavailable for these files. Use Save, then attach the saved files in WhatsApp.");
      return;
    }

    try {
      await shareFiles(files);
    } catch (error) {
      if (error && error.name === "AbortError") return;
      console.error("Recording share failed", error);
      alert("Sharing could not be completed. Use Save, then attach the saved files in WhatsApp.");
    }
  }

  function saveFile(file, objectUrl) {
    if (!file) return false;
    const url = objectUrl || URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (!objectUrl) window.setTimeout(() => cleanObjectUrl(url), 1000);
    return true;
  }

  function hideSaveReminder() {
    if (els.saveReminder) els.saveReminder.hidden = true;
  }

  function showSaveReminder(files) {
    if (!els.saveReminder) return false;
    const fileNames = files.map(file => file.name).join(", ");
    let instruction = "Your browser has started saving the recording.";
    if (state.resultKind === "audio-image") {
      instruction = "Your browser has started saving both files. If Chrome asks, allow multiple files. Open WhatsApp, choose the recipient, and attach both saved files as Documents.";
    } else if (state.resultKind === "audio-only") {
      instruction = "Your browser has started saving the audio. Open WhatsApp, choose the recipient, and attach the saved audio as a Document.";
    } else if (state.resultKind === "video-mp4") {
      instruction = "Your browser has started saving the MP4. Open WhatsApp, choose the recipient, and attach the saved video.";
    }
    if (els.saveReminderText) {
      els.saveReminderText.textContent = `${instruction} Saved name${files.length === 1 ? "" : "s"}: ${fileNames}`;
    }
    els.saveReminder.hidden = false;
    return true;
  }

  function saveRecording() {
    const files = getResultFiles();
    if (!files.length) {
      alert("No recording is ready to save.");
      return false;
    }

    files.forEach(file => {
      const objectUrl = file === state.recordingFile
        ? state.recordingUrl
        : file === state.pageImageFile
          ? state.pageImageUrl
          : "";
      saveFile(file, objectUrl);
    });
    showSaveReminder(files);
    return true;
  }

  function openWhatsapp() {
    const title = state.selectedPage ? state.selectedPage.title : "Audio recording";
    const message = state.selectedPage ? `${title} reading` : "Audio recording";
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    const opened = window.open(whatsappUrl, "_blank");
    if (opened) {
      try { opened.opener = null; } catch (error) { console.warn("Could not clear WhatsApp window opener", error); }
    } else {
      window.location.assign(whatsappUrl);
    }
  }

  function goToPages() {
    if (isRecordingActive()) {
      alert("Stop the recording before changing page.");
      return false;
    }

    const previousView = state.currentView;
    const currentHistoryState = window.history && window.history.state;
    const isRecorderHistoryState = !!(
      currentHistoryState &&
      currentHistoryState.app === "maktab4life" &&
      String(currentHistoryState.section || "") === "recorder"
    );

    cleanup({ keepPages: true });
    renderBookSelector();

    if (isRecorderHistoryState && previousView === "preview" && typeof window.history.go === "function") {
      window.history.go(-2);
      return true;
    }

    if (isRecorderHistoryState && previousView === "record" && typeof window.history.back === "function") {
      window.history.back();
      return true;
    }

    showView("pages", { replace: true });
    return true;
  }

  function rerecordSelectedPage() {
    const audioOnly = state.sourceMode === "audio-only";
    if (!audioOnly && (!state.selectedPage || !state.selectedImage)) {
      return goToPages();
    }

    cleanup({
      keepPages: true,
      keepSelectedPage: !audioOnly,
      keepSourceMode: true
    });
    if (!audioOnly) drawSelectedPage();
    updateRecordStage();

    const currentHistoryState = window.history && window.history.state;
    const isPreviewHistoryState = !!(
      currentHistoryState &&
      currentHistoryState.app === "maktab4life" &&
      String(currentHistoryState.section || "") === "recorder" &&
      String(currentHistoryState.viewId || "") === "preview"
    );

    if (isPreviewHistoryState && typeof window.history.back === "function") {
      window.history.back();
      return true;
    }

    showView("record", { replace: true });
    return true;
  }

  function bindEvents() {
    if (els.bookSelect) {
      els.bookSelect.addEventListener("change", event => {
        const value = String(event.target.value || "");
        if (value === "__upload") {
          event.target.value = state.selectedBookId === "__upload"
            ? "__current_upload"
            : (state.selectedBookId || "");

          setStatus("Choose one JPG, PNG or WebP image, up to 15 MB. The image stays on this device.");
          resetRecorderUploadInput();
          if (els.pageUpload) els.pageUpload.click();
          return;
        }
        if (value === "__current_upload") {
          renderPageGrid();
          setStatus("Own image selected · tap the image to record again");
          return;
        }
        if (value === "__audio_only") {
          selectAudioOnly();
          return;
        }
        setBook(value);
      });
    }

    if (els.pageUpload) {
      els.pageUpload.addEventListener("change", event => {
        handleUploadedImageSelection(event.target.files).catch(error => {
          console.error("Recorder upload selection failed", error);
          const message = "This image could not be opened. Choose one JPG, PNG or WebP image up to 15 MB.";
          setStatus(message, { kind: "error" });
          alert(message);
          resetRecorderUploadInput();
        });
      });
    }

    if (els.pageGrid) {
      els.pageGrid.addEventListener("click", event => {
        const card = event.target.closest(".m4l-recorder-page-card");
        if (!card) return;
        selectPage(Number(card.dataset.pageIndex || 0)).catch(error => {
          console.error(error);
          setStatus("Could not open this page image.", { kind: "error" });
          alert("Could not open this page image.");
        });
      });
    }

    if (els.backToPages) els.backToPages.addEventListener("click", goToPages);
    if (els.previewPages) els.previewPages.addEventListener("click", goToPages);
    if (els.recordBtn) els.recordBtn.addEventListener("click", startRecording);
    if (els.stopBtn) els.stopBtn.addEventListener("click", () => stopRecording("manual"));
    if (els.rerecordBtn) {
      els.rerecordBtn.addEventListener("click", rerecordSelectedPage);
    }
    if (els.shareBtn) els.shareBtn.addEventListener("click", shareRecording);
    if (els.saveBtn) els.saveBtn.addEventListener("click", saveRecording);
    if (els.openWhatsappBtn) els.openWhatsappBtn.addEventListener("click", openWhatsapp);
    if (els.dismissSaveReminderBtn) els.dismissSaveReminderBtn.addEventListener("click", hideSaveReminder);

    window.addEventListener("pagehide", () => cleanup({
      keepPages: true,
      keepSelectedPage: true,
      keepSourceMode: true
    }));
    window.addEventListener("resize", () => {
      if (state.selectedImage && els.recordView && els.recordView.classList.contains("active")) {
        drawSelectedPage();
      }
    }, { passive: true });
  }

  function init() {
    if (state.initialized) return true;
    if (!cacheElements()) return false;

    state.initialized = true;
    state.canvasContext = els.canvas.getContext("2d", { alpha: false });
    resetTimer();
    updateRecordStage();
    bindEvents();

    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== "function") {
      if (els.helper) els.helper.textContent = "This browser cannot access the microphone for recording.";
    }

    loadManifest();
    return true;
  }

  function open() {
    init();

    if (!state.manifestLoaded && !state.books.length) {
      loadManifest();
    }

    const hasActiveSource = state.sourceMode === "audio-only" || state.selectedImage;
    const viewName = hasActiveSource && state.currentView !== "pages"
      ? state.currentView
      : "pages";

    showView(viewName);
    return true;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }

  window.M4LRecorder = {
    init,
    open,
    cleanup,
    loadManifest,
    restoreHistoryState,
    getCurrentView() {
      return state.currentView;
    },
    isRecordingActive
  };
})();
