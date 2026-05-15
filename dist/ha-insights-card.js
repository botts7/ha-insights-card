/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise, SuppressedError, Symbol, Iterator */


function __decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}

typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
};

/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t$2=globalThis,e$2=t$2.ShadowRoot&&(void 0===t$2.ShadyCSS||t$2.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,s$2=Symbol(),o$4=new WeakMap;let n$3 = class n{constructor(t,e,o){if(this._$cssResult$=true,o!==s$2)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e;}get styleSheet(){let t=this.o;const s=this.t;if(e$2&&void 0===t){const e=void 0!==s&&1===s.length;e&&(t=o$4.get(s)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),e&&o$4.set(s,t));}return t}toString(){return this.cssText}};const r$4=t=>new n$3("string"==typeof t?t:t+"",void 0,s$2),i$3=(t,...e)=>{const o=1===t.length?t[0]:e.reduce((e,s,o)=>e+(t=>{if(true===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+t[o+1],t[0]);return new n$3(o,t,s$2)},S$1=(s,o)=>{if(e$2)s.adoptedStyleSheets=o.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const e of o){const o=document.createElement("style"),n=t$2.litNonce;void 0!==n&&o.setAttribute("nonce",n),o.textContent=e.cssText,s.appendChild(o);}},c$2=e$2?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const s of t.cssRules)e+=s.cssText;return r$4(e)})(t):t;

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const{is:i$2,defineProperty:e$1,getOwnPropertyDescriptor:h$1,getOwnPropertyNames:r$3,getOwnPropertySymbols:o$3,getPrototypeOf:n$2}=Object,a$1=globalThis,c$1=a$1.trustedTypes,l$1=c$1?c$1.emptyScript:"",p$1=a$1.reactiveElementPolyfillSupport,d$1=(t,s)=>t,u$1={toAttribute(t,s){switch(s){case Boolean:t=t?l$1:null;break;case Object:case Array:t=null==t?t:JSON.stringify(t);}return t},fromAttribute(t,s){let i=t;switch(s){case Boolean:i=null!==t;break;case Number:i=null===t?null:Number(t);break;case Object:case Array:try{i=JSON.parse(t);}catch(t){i=null;}}return i}},f$1=(t,s)=>!i$2(t,s),b$1={attribute:true,type:String,converter:u$1,reflect:false,useDefault:false,hasChanged:f$1};Symbol.metadata??=Symbol("metadata"),a$1.litPropertyMetadata??=new WeakMap;let y$1 = class y extends HTMLElement{static addInitializer(t){this._$Ei(),(this.l??=[]).push(t);}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(t,s=b$1){if(s.state&&(s.attribute=false),this._$Ei(),this.prototype.hasOwnProperty(t)&&((s=Object.create(s)).wrapped=true),this.elementProperties.set(t,s),!s.noAccessor){const i=Symbol(),h=this.getPropertyDescriptor(t,i,s);void 0!==h&&e$1(this.prototype,t,h);}}static getPropertyDescriptor(t,s,i){const{get:e,set:r}=h$1(this.prototype,t)??{get(){return this[s]},set(t){this[s]=t;}};return {get:e,set(s){const h=e?.call(this);r?.call(this,s),this.requestUpdate(t,h,i);},configurable:true,enumerable:true}}static getPropertyOptions(t){return this.elementProperties.get(t)??b$1}static _$Ei(){if(this.hasOwnProperty(d$1("elementProperties")))return;const t=n$2(this);t.finalize(),void 0!==t.l&&(this.l=[...t.l]),this.elementProperties=new Map(t.elementProperties);}static finalize(){if(this.hasOwnProperty(d$1("finalized")))return;if(this.finalized=true,this._$Ei(),this.hasOwnProperty(d$1("properties"))){const t=this.properties,s=[...r$3(t),...o$3(t)];for(const i of s)this.createProperty(i,t[i]);}const t=this[Symbol.metadata];if(null!==t){const s=litPropertyMetadata.get(t);if(void 0!==s)for(const[t,i]of s)this.elementProperties.set(t,i);}this._$Eh=new Map;for(const[t,s]of this.elementProperties){const i=this._$Eu(t,s);void 0!==i&&this._$Eh.set(i,t);}this.elementStyles=this.finalizeStyles(this.styles);}static finalizeStyles(s){const i=[];if(Array.isArray(s)){const e=new Set(s.flat(1/0).reverse());for(const s of e)i.unshift(c$2(s));}else void 0!==s&&i.push(c$2(s));return i}static _$Eu(t,s){const i=s.attribute;return  false===i?void 0:"string"==typeof i?i:"string"==typeof t?t.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=false,this.hasUpdated=false,this._$Em=null,this._$Ev();}_$Ev(){this._$ES=new Promise(t=>this.enableUpdating=t),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(t=>t(this));}addController(t){(this._$EO??=new Set).add(t),void 0!==this.renderRoot&&this.isConnected&&t.hostConnected?.();}removeController(t){this._$EO?.delete(t);}_$E_(){const t=new Map,s=this.constructor.elementProperties;for(const i of s.keys())this.hasOwnProperty(i)&&(t.set(i,this[i]),delete this[i]);t.size>0&&(this._$Ep=t);}createRenderRoot(){const t=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return S$1(t,this.constructor.elementStyles),t}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(true),this._$EO?.forEach(t=>t.hostConnected?.());}enableUpdating(t){}disconnectedCallback(){this._$EO?.forEach(t=>t.hostDisconnected?.());}attributeChangedCallback(t,s,i){this._$AK(t,i);}_$ET(t,s){const i=this.constructor.elementProperties.get(t),e=this.constructor._$Eu(t,i);if(void 0!==e&&true===i.reflect){const h=(void 0!==i.converter?.toAttribute?i.converter:u$1).toAttribute(s,i.type);this._$Em=t,null==h?this.removeAttribute(e):this.setAttribute(e,h),this._$Em=null;}}_$AK(t,s){const i=this.constructor,e=i._$Eh.get(t);if(void 0!==e&&this._$Em!==e){const t=i.getPropertyOptions(e),h="function"==typeof t.converter?{fromAttribute:t.converter}:void 0!==t.converter?.fromAttribute?t.converter:u$1;this._$Em=e;const r=h.fromAttribute(s,t.type);this[e]=r??this._$Ej?.get(e)??r,this._$Em=null;}}requestUpdate(t,s,i,e=false,h){if(void 0!==t){const r=this.constructor;if(false===e&&(h=this[t]),i??=r.getPropertyOptions(t),!((i.hasChanged??f$1)(h,s)||i.useDefault&&i.reflect&&h===this._$Ej?.get(t)&&!this.hasAttribute(r._$Eu(t,i))))return;this.C(t,s,i);} false===this.isUpdatePending&&(this._$ES=this._$EP());}C(t,s,{useDefault:i,reflect:e,wrapped:h},r){i&&!(this._$Ej??=new Map).has(t)&&(this._$Ej.set(t,r??s??this[t]),true!==h||void 0!==r)||(this._$AL.has(t)||(this.hasUpdated||i||(s=void 0),this._$AL.set(t,s)),true===e&&this._$Em!==t&&(this._$Eq??=new Set).add(t));}async _$EP(){this.isUpdatePending=true;try{await this._$ES;}catch(t){Promise.reject(t);}const t=this.scheduleUpdate();return null!=t&&await t,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(const[t,s]of this._$Ep)this[t]=s;this._$Ep=void 0;}const t=this.constructor.elementProperties;if(t.size>0)for(const[s,i]of t){const{wrapped:t}=i,e=this[s];true!==t||this._$AL.has(s)||void 0===e||this.C(s,void 0,i,e);}}let t=false;const s=this._$AL;try{t=this.shouldUpdate(s),t?(this.willUpdate(s),this._$EO?.forEach(t=>t.hostUpdate?.()),this.update(s)):this._$EM();}catch(s){throw t=false,this._$EM(),s}t&&this._$AE(s);}willUpdate(t){}_$AE(t){this._$EO?.forEach(t=>t.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=true,this.firstUpdated(t)),this.updated(t);}_$EM(){this._$AL=new Map,this.isUpdatePending=false;}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(t){return  true}update(t){this._$Eq&&=this._$Eq.forEach(t=>this._$ET(t,this[t])),this._$EM();}updated(t){}firstUpdated(t){}};y$1.elementStyles=[],y$1.shadowRootOptions={mode:"open"},y$1[d$1("elementProperties")]=new Map,y$1[d$1("finalized")]=new Map,p$1?.({ReactiveElement:y$1}),(a$1.reactiveElementVersions??=[]).push("2.1.2");

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t$1=globalThis,i$1=t=>t,s$1=t$1.trustedTypes,e=s$1?s$1.createPolicy("lit-html",{createHTML:t=>t}):void 0,h="$lit$",o$2=`lit$${Math.random().toFixed(9).slice(2)}$`,n$1="?"+o$2,r$2=`<${n$1}>`,l=document,c=()=>l.createComment(""),a=t=>null===t||"object"!=typeof t&&"function"!=typeof t,u=Array.isArray,d=t=>u(t)||"function"==typeof t?.[Symbol.iterator],f="[ \t\n\f\r]",v=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,_=/-->/g,m=/>/g,p=RegExp(`>|${f}(?:([^\\s"'>=/]+)(${f}*=${f}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),g=/'/g,$=/"/g,y=/^(?:script|style|textarea|title)$/i,x=t=>(i,...s)=>({_$litType$:t,strings:i,values:s}),b=x(1),E=Symbol.for("lit-noChange"),A=Symbol.for("lit-nothing"),C=new WeakMap,P=l.createTreeWalker(l,129);function V(t,i){if(!u(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==e?e.createHTML(i):i}const N=(t,i)=>{const s=t.length-1,e=[];let n,l=2===i?"<svg>":3===i?"<math>":"",c=v;for(let i=0;i<s;i++){const s=t[i];let a,u,d=-1,f=0;for(;f<s.length&&(c.lastIndex=f,u=c.exec(s),null!==u);)f=c.lastIndex,c===v?"!--"===u[1]?c=_:void 0!==u[1]?c=m:void 0!==u[2]?(y.test(u[2])&&(n=RegExp("</"+u[2],"g")),c=p):void 0!==u[3]&&(c=p):c===p?">"===u[0]?(c=n??v,d=-1):void 0===u[1]?d=-2:(d=c.lastIndex-u[2].length,a=u[1],c=void 0===u[3]?p:'"'===u[3]?$:g):c===$||c===g?c=p:c===_||c===m?c=v:(c=p,n=void 0);const x=c===p&&t[i+1].startsWith("/>")?" ":"";l+=c===v?s+r$2:d>=0?(e.push(a),s.slice(0,d)+h+s.slice(d)+o$2+x):s+o$2+(-2===d?i:x);}return [V(t,l+(t[s]||"<?>")+(2===i?"</svg>":3===i?"</math>":"")),e]};class S{constructor({strings:t,_$litType$:i},e){let r;this.parts=[];let l=0,a=0;const u=t.length-1,d=this.parts,[f,v]=N(t,i);if(this.el=S.createElement(f,e),P.currentNode=this.el.content,2===i||3===i){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes);}for(;null!==(r=P.nextNode())&&d.length<u;){if(1===r.nodeType){if(r.hasAttributes())for(const t of r.getAttributeNames())if(t.endsWith(h)){const i=v[a++],s=r.getAttribute(t).split(o$2),e=/([.?@])?(.*)/.exec(i);d.push({type:1,index:l,name:e[2],strings:s,ctor:"."===e[1]?I:"?"===e[1]?L:"@"===e[1]?z:H}),r.removeAttribute(t);}else t.startsWith(o$2)&&(d.push({type:6,index:l}),r.removeAttribute(t));if(y.test(r.tagName)){const t=r.textContent.split(o$2),i=t.length-1;if(i>0){r.textContent=s$1?s$1.emptyScript:"";for(let s=0;s<i;s++)r.append(t[s],c()),P.nextNode(),d.push({type:2,index:++l});r.append(t[i],c());}}}else if(8===r.nodeType)if(r.data===n$1)d.push({type:2,index:l});else {let t=-1;for(;-1!==(t=r.data.indexOf(o$2,t+1));)d.push({type:7,index:l}),t+=o$2.length-1;}l++;}}static createElement(t,i){const s=l.createElement("template");return s.innerHTML=t,s}}function M(t,i,s=t,e){if(i===E)return i;let h=void 0!==e?s._$Co?.[e]:s._$Cl;const o=a(i)?void 0:i._$litDirective$;return h?.constructor!==o&&(h?._$AO?.(false),void 0===o?h=void 0:(h=new o(t),h._$AT(t,s,e)),void 0!==e?(s._$Co??=[])[e]=h:s._$Cl=h),void 0!==h&&(i=M(t,h._$AS(t,i.values),h,e)),i}class R{constructor(t,i){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=i;}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:i},parts:s}=this._$AD,e=(t?.creationScope??l).importNode(i,true);P.currentNode=e;let h=P.nextNode(),o=0,n=0,r=s[0];for(;void 0!==r;){if(o===r.index){let i;2===r.type?i=new k(h,h.nextSibling,this,t):1===r.type?i=new r.ctor(h,r.name,r.strings,this,t):6===r.type&&(i=new Z(h,this,t)),this._$AV.push(i),r=s[++n];}o!==r?.index&&(h=P.nextNode(),o++);}return P.currentNode=l,e}p(t){let i=0;for(const s of this._$AV) void 0!==s&&(void 0!==s.strings?(s._$AI(t,s,i),i+=s.strings.length-2):s._$AI(t[i])),i++;}}class k{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,i,s,e){this.type=2,this._$AH=A,this._$AN=void 0,this._$AA=t,this._$AB=i,this._$AM=s,this.options=e,this._$Cv=e?.isConnected??true;}get parentNode(){let t=this._$AA.parentNode;const i=this._$AM;return void 0!==i&&11===t?.nodeType&&(t=i.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,i=this){t=M(this,t,i),a(t)?t===A||null==t||""===t?(this._$AH!==A&&this._$AR(),this._$AH=A):t!==this._$AH&&t!==E&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):d(t)?this.k(t):this._(t);}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t));}_(t){this._$AH!==A&&a(this._$AH)?this._$AA.nextSibling.data=t:this.T(l.createTextNode(t)),this._$AH=t;}$(t){const{values:i,_$litType$:s}=t,e="number"==typeof s?this._$AC(t):(void 0===s.el&&(s.el=S.createElement(V(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===e)this._$AH.p(i);else {const t=new R(e,this),s=t.u(this.options);t.p(i),this.T(s),this._$AH=t;}}_$AC(t){let i=C.get(t.strings);return void 0===i&&C.set(t.strings,i=new S(t)),i}k(t){u(this._$AH)||(this._$AH=[],this._$AR());const i=this._$AH;let s,e=0;for(const h of t)e===i.length?i.push(s=new k(this.O(c()),this.O(c()),this,this.options)):s=i[e],s._$AI(h),e++;e<i.length&&(this._$AR(s&&s._$AB.nextSibling,e),i.length=e);}_$AR(t=this._$AA.nextSibling,s){for(this._$AP?.(false,true,s);t!==this._$AB;){const s=i$1(t).nextSibling;i$1(t).remove(),t=s;}}setConnected(t){ void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t));}}class H{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,i,s,e,h){this.type=1,this._$AH=A,this._$AN=void 0,this.element=t,this.name=i,this._$AM=e,this.options=h,s.length>2||""!==s[0]||""!==s[1]?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=A;}_$AI(t,i=this,s,e){const h=this.strings;let o=false;if(void 0===h)t=M(this,t,i,0),o=!a(t)||t!==this._$AH&&t!==E,o&&(this._$AH=t);else {const e=t;let n,r;for(t=h[0],n=0;n<h.length-1;n++)r=M(this,e[s+n],i,n),r===E&&(r=this._$AH[n]),o||=!a(r)||r!==this._$AH[n],r===A?t=A:t!==A&&(t+=(r??"")+h[n+1]),this._$AH[n]=r;}o&&!e&&this.j(t);}j(t){t===A?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"");}}class I extends H{constructor(){super(...arguments),this.type=3;}j(t){this.element[this.name]=t===A?void 0:t;}}class L extends H{constructor(){super(...arguments),this.type=4;}j(t){this.element.toggleAttribute(this.name,!!t&&t!==A);}}class z extends H{constructor(t,i,s,e,h){super(t,i,s,e,h),this.type=5;}_$AI(t,i=this){if((t=M(this,t,i,0)??A)===E)return;const s=this._$AH,e=t===A&&s!==A||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,h=t!==A&&(s===A||e);e&&this.element.removeEventListener(this.name,this,s),h&&this.element.addEventListener(this.name,this,t),this._$AH=t;}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t);}}class Z{constructor(t,i,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=i,this.options=s;}get _$AU(){return this._$AM._$AU}_$AI(t){M(this,t);}}const B=t$1.litHtmlPolyfillSupport;B?.(S,k),(t$1.litHtmlVersions??=[]).push("3.3.2");const D=(t,i,s)=>{const e=s?.renderBefore??i;let h=e._$litPart$;if(void 0===h){const t=s?.renderBefore??null;e._$litPart$=h=new k(i.insertBefore(c(),t),t,void 0,s??{});}return h._$AI(t),h};

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const s=globalThis;class i extends y$1{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0;}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const r=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=D(r,this.renderRoot,this.renderOptions);}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(true);}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(false);}render(){return E}}i._$litElement$=true,i["finalized"]=true,s.litElementHydrateSupport?.({LitElement:i});const o$1=s.litElementPolyfillSupport;o$1?.({LitElement:i});(s.litElementVersions??=[]).push("4.2.2");

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t=t=>(e,o)=>{ void 0!==o?o.addInitializer(()=>{customElements.define(t,e);}):customElements.define(t,e);};

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const o={attribute:true,type:String,converter:u$1,reflect:false,hasChanged:f$1},r$1=(t=o,e,r)=>{const{kind:n,metadata:i}=r;let s=globalThis.litPropertyMetadata.get(i);if(void 0===s&&globalThis.litPropertyMetadata.set(i,s=new Map),"setter"===n&&((t=Object.create(t)).wrapped=true),s.set(r.name,t),"accessor"===n){const{name:o}=r;return {set(r){const n=e.get.call(this);e.set.call(this,r),this.requestUpdate(o,n,t,true,r);},init(e){return void 0!==e&&this.C(o,void 0,t,e),e}}}if("setter"===n){const{name:o}=r;return function(r){const n=this[o];e.call(this,r),this.requestUpdate(o,n,t,true,r);}}throw Error("Unsupported decorator location: "+n)};function n(t){return (e,o)=>"object"==typeof o?r$1(t,e,o):((t,e,o)=>{const r=e.hasOwnProperty(o);return e.constructor.createProperty(o,t),r?Object.getOwnPropertyDescriptor(e,o):void 0})(t,e,o)}

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */function r(r){return n({...r,state:true,attribute:false})}

const SCHEMA = [
    { name: "title", selector: { text: {} } },
    {
        name: "min_confidence",
        selector: {
            number: {
                min: 0,
                max: 1,
                step: 0.05,
                mode: "slider",
            },
        },
    },
    {
        name: "max_rows",
        selector: {
            number: {
                min: 0,
                max: 100,
                step: 1,
                mode: "box",
            },
        },
    },
    {
        name: "compact",
        selector: { boolean: {} },
    },
    {
        name: "tts_target_entity_id",
        selector: { entity: { domain: "media_player" } },
    },
    {
        name: "tts_engine_entity_id",
        selector: { entity: { domain: "tts" } },
    },
    {
        name: "search",
        selector: { text: {} },
    },
    {
        name: "include_dismissed",
        selector: { boolean: {} },
    },
    {
        name: "include_applied",
        selector: { boolean: {} },
    },
    {
        name: "sort_by",
        selector: {
            select: {
                mode: "dropdown",
                options: [
                    { value: "confidence", label: "Confidence (highest first)" },
                    { value: "age", label: "Age (newest first)" },
                    { value: "detector", label: "Detector name" },
                    { value: "area", label: "Area" },
                ],
            },
        },
    },
    {
        name: "group_by",
        selector: {
            select: {
                mode: "dropdown",
                options: [
                    { value: "none", label: "No grouping" },
                    { value: "detector", label: "By detector" },
                    { value: "area", label: "By area" },
                    { value: "floor", label: "By floor" },
                    { value: "integration", label: "By integration" },
                    { value: "label", label: "By label" },
                ],
            },
        },
    },
];
const LABELS = {
    title: "Card title",
    min_confidence: "Minimum confidence",
    max_rows: "Max rows (leave blank for auto-fit)",
    compact: "Compact tile mode (single-line summary linking to panel)",
    tts_target_entity_id: "TTS target (media_player) — shows 🔊 Read aloud",
    tts_engine_entity_id: "TTS engine (optional override)",
    search: "Default search filter (case-insensitive title match)",
    include_dismissed: "Show dismissed insights",
    include_applied: "Show insights you've already applied",
    sort_by: "Sort order",
    group_by: "Group rows by",
};
class HaInsightsCardEditor extends i {
    constructor() {
        super(...arguments);
        this._computeLabel = (schema) => LABELS[schema.name] ?? schema.name;
    }
    setConfig(config) {
        this._config = config;
    }
    render() {
        if (!this._config)
            return b ``;
        // ha-form is a custom element that HA's frontend registers globally.
        // We don't import a class; we just render the tag.
        return b `
      <ha-form
        .hass=${this.hass}
        .data=${this._config}
        .schema=${SCHEMA}
        .computeLabel=${this._computeLabel}
        @value-changed=${this._onChanged}
      ></ha-form>
    `;
    }
    _onChanged(ev) {
        const incoming = { ...ev.detail.value };
        // Strip empties so the YAML stays clean (HA's frontend inserts "" for
        // text fields the user clears, which would otherwise persist as noise).
        for (const key of Object.keys(incoming)) {
            const value = incoming[key];
            if (value === "" || value === null) {
                delete incoming[key];
            }
        }
        // type field is required by Lovelace; preserve it
        if (this._config?.type && !("type" in incoming)) {
            incoming.type = this._config.type;
        }
        const next = incoming;
        this._config = next;
        this.dispatchEvent(new CustomEvent("config-changed", {
            detail: { config: next },
            bubbles: true,
            composed: true,
        }));
    }
}
__decorate([
    n({ attribute: false })
], HaInsightsCardEditor.prototype, "hass", void 0);
__decorate([
    r()
], HaInsightsCardEditor.prototype, "_config", void 0);
// Guard against double-registration — same rationale as ha-insights-card.
if (!customElements.get("ha-insights-card-editor")) {
    customElements.define("ha-insights-card-editor", HaInsightsCardEditor);
}

let BulkAreaAssignDialog = class BulkAreaAssignDialog extends i {
    constructor() {
        super(...arguments);
        this.open = false;
        this._tab = "devices";
        this._areas = [];
        this._devices = [];
        this._entities = [];
        /** Map keyed by `device:ID` or `entity:ID` → chosen area_id (or ""
         *  for "clear area"). Empty means no pending change for that row. */
        this._pending = new Map();
        this._loading = false;
        this._saving = false;
        this._savedCount = 0;
        this._failedRows = [];
        // v1.2.14: structured per-row record of what got assigned so the
        // success banner can render a "Kitchen TV → Kitchen" list instead
        // of a bare count. Format: { label, area_name } per successfully-
        // saved row, in the order they were saved.
        this._savedAssignments = [];
        /** When true, includes rows that already have an area. Default off
         *  so the first-load picture is "things you haven't classified yet". */
        this._showAll = false;
        this._filter = "";
        /** v1.2.7 — Structured filters in addition to free-text search.
         *  Empty string = "all". Populated from the actual data on fetch
         *  so users only see options they have. */
        this._filterIntegration = "";
        this._filterManufacturer = "";
        this._filterDomain = ""; // entities tab only
        this._onClose = () => {
            if (this._saving)
                return; // don't close mid-save
            this.open = false;
            this.dispatchEvent(new CustomEvent("closed", { bubbles: true, composed: true }));
        };
    }
    updated(changedProps) {
        // Lazy-fetch when the dialog transitions to open.
        if (changedProps.has("open") && this.open && this.hass) {
            void this._fetchRegistries();
        }
    }
    async _fetchRegistries(opts) {
        if (!this.hass)
            return;
        this._loading = true;
        this._error = undefined;
        // v1.2.14: don't reset saved-state on post-save refreshes — the
        // success banner is the user's confirmation that the save worked,
        // and clobbering it 50ms later made the dialog look like it
        // "popped up for a second then disappeared". On dialog OPEN we
        // do reset (preserveSavedState left default) since the prior
        // session's saved-state is stale by then.
        if (!opts?.preserveSavedState) {
            this._pending = new Map();
            this._savedCount = 0;
            this._failedRows = [];
            this._savedAssignments = [];
        }
        try {
            const [areas, devices, entities] = await Promise.all([
                this.hass.connection.sendMessagePromise({
                    type: "config/area_registry/list",
                }),
                this.hass.connection.sendMessagePromise({
                    type: "config/device_registry/list",
                }),
                this.hass.connection.sendMessagePromise({
                    type: "config/entity_registry/list",
                }),
            ]);
            this._areas = (areas ?? []).slice().sort((a, b) => a.name.localeCompare(b.name));
            this._devices = (devices ?? []).filter((d) => !d.disabled_by);
            this._entities = (entities ?? []).filter((e) => !e.disabled_by && !e.hidden_by);
        }
        catch (err) {
            this._error = `Could not load registries: ${this._errMsg(err)}`;
        }
        finally {
            this._loading = false;
        }
    }
    _errMsg(err) {
        if (err instanceof Error)
            return err.message;
        if (typeof err === "string")
            return err;
        try {
            return JSON.stringify(err);
        }
        catch {
            return "unknown error";
        }
    }
    _deviceLabel(d) {
        return (d.name_by_user ||
            d.name ||
            d.id ||
            "(unnamed device)");
    }
    _entityLabel(e) {
        return e.name || e.original_name || e.entity_id;
    }
    _areaNameById(area_id) {
        if (!area_id)
            return "";
        return this._areas.find((a) => a.area_id === area_id)?.name ?? area_id;
    }
    /** v1.2.7 — Available filter values, derived from the loaded data
     *  so users only see options that exist in their install.
     *  Sorted alphabetically. Empty strings filtered out. */
    _availableIntegrations() {
        const set = new Set();
        if (this._tab === "devices") {
            for (const d of this._devices) {
                d.config_entries?.[0];
                // Manufacturer is a more reliable signal at device level.
            }
        }
        else {
            for (const e of this._entities) {
                if (e.platform)
                    set.add(e.platform);
            }
        }
        return [...set].sort();
    }
    _availableManufacturers() {
        const set = new Set();
        for (const d of this._devices) {
            if (d.manufacturer)
                set.add(d.manufacturer);
        }
        return [...set].sort();
    }
    _availableDomains() {
        const set = new Set();
        for (const e of this._entities) {
            const dot = e.entity_id.indexOf(".");
            if (dot > 0)
                set.add(e.entity_id.slice(0, dot));
        }
        return [...set].sort();
    }
    _filteredDevices() {
        const f = this._filter.trim().toLowerCase();
        const fMfr = this._filterManufacturer;
        return this._devices.filter((d) => {
            if (!this._showAll && d.area_id)
                return false;
            if (fMfr && d.manufacturer !== fMfr)
                return false;
            if (!f)
                return true;
            const hay = (this._deviceLabel(d) + " " + (d.manufacturer ?? "") + " " +
                (d.model ?? "")).toLowerCase();
            return hay.includes(f);
        });
    }
    _filteredEntities() {
        const f = this._filter.trim().toLowerCase();
        const fInt = this._filterIntegration;
        const fDom = this._filterDomain;
        return this._entities.filter((e) => {
            // Skip entities whose device already has an area (cascade
            // handles them). User can flip Show All to override.
            if (!this._showAll) {
                if (e.area_id)
                    return false;
                if (e.device_id) {
                    const dev = this._devices.find((d) => d.id === e.device_id);
                    if (dev?.area_id)
                        return false;
                }
            }
            if (fInt && e.platform !== fInt)
                return false;
            if (fDom) {
                const dot = e.entity_id.indexOf(".");
                const dom = dot > 0 ? e.entity_id.slice(0, dot) : "";
                if (dom !== fDom)
                    return false;
            }
            if (!f)
                return true;
            return e.entity_id.toLowerCase().includes(f) ||
                this._entityLabel(e).toLowerCase().includes(f);
        });
    }
    _onPick(key, area_id) {
        const next = new Map(this._pending);
        if (area_id === "__unchanged__") {
            next.delete(key);
        }
        else {
            next.set(key, area_id);
        }
        this._pending = next;
    }
    async _save() {
        if (!this.hass || this._pending.size === 0)
            return;
        this._saving = true;
        this._failedRows = [];
        this._savedCount = 0;
        this._savedAssignments = [];
        const failed = [];
        const succeededKeys = [];
        const summary = [];
        for (const [key, area_id] of this._pending.entries()) {
            const [kind, id] = key.split(":", 2);
            // v1.2.14: capture the human-readable label + area name BEFORE
            // the registry update succeeds, so the post-save summary can
            // show "Kitchen TV → Kitchen" rather than just an ID.
            const label = this._labelForKey(kind, id);
            const areaName = area_id
                ? this._areaNameById(area_id)
                : "(no area)";
            try {
                if (kind === "device") {
                    await this.hass.connection.sendMessagePromise({
                        type: "config/device_registry/update",
                        device_id: id,
                        area_id: area_id || null,
                    });
                }
                else if (kind === "entity") {
                    await this.hass.connection.sendMessagePromise({
                        type: "config/entity_registry/update_entity",
                        entity_id: id,
                        area_id: area_id || null,
                    });
                }
                succeededKeys.push(key);
                summary.push({ label, area_name: areaName });
            }
            catch (err) {
                failed.push(`${label}: ${this._errMsg(err)}`);
            }
        }
        // v1.2.14: drop successfully-saved rows from _pending so the
        // "Save N changes" button reflects only the work still owed.
        // Pre-v1.2.14 the pending map was never cleared, so the button
        // re-armed itself forever and a second click would attempt to
        // re-save rows the registry already accepted.
        if (succeededKeys.length > 0) {
            const next = new Map(this._pending);
            for (const k of succeededKeys)
                next.delete(k);
            this._pending = next;
        }
        this._savedCount = summary.length;
        this._savedAssignments = summary;
        this._failedRows = failed;
        this._saving = false;
        // Refresh registries so the table reflects the saved state.
        // preserveSavedState=true keeps the success banner visible —
        // pre-v1.2.14 we wiped _savedCount inside _fetchRegistries, which
        // made the success banner flash and disappear immediately.
        await this._fetchRegistries({ preserveSavedState: true });
        // Emit so the host can refresh its own list / fire a scan.
        this.dispatchEvent(new CustomEvent("assignments-saved", {
            detail: { saved: summary.length, failed: failed.length },
            bubbles: true,
            composed: true,
        }));
    }
    /** v1.2.14: friendly label for a pending row key, used in the
     *  post-save summary. Devices fall back to `<no name>` if HA gave
     *  us a device with neither name nor name_by_user. */
    _labelForKey(kind, id) {
        if (kind === "device") {
            const d = this._devices.find((x) => x.id === id);
            return (d?.name_by_user || d?.name || `<device ${id.slice(0, 8)}…>`);
        }
        if (kind === "entity") {
            const e = this._entities.find((x) => x.entity_id === id);
            return e?.name || id;
        }
        return id;
    }
    _renderAreaPicker(key, currentAreaId) {
        const pendingValue = this._pending.get(key);
        // Three-state value: "__unchanged__" (initial), area_id (picked),
        // or "" (explicit clear). Default selected = pendingValue ?? current.
        const selected = pendingValue !== undefined
            ? pendingValue
            : (currentAreaId ?? "__unchanged__");
        return b `
      <select
        class="area-picker"
        .value=${selected}
        @change=${(e) => {
            const v = e.target.value;
            this._onPick(key, v);
        }}
        ?disabled=${this._saving}
      >
        <option value="__unchanged__">
          ${currentAreaId
            ? `keep current (${this._areaNameById(currentAreaId)})`
            : "Pick area…"}
        </option>
        ${currentAreaId
            ? b `<option value="">— clear area —</option>`
            : A}
        ${this._areas.map((a) => b `<option value=${a.area_id}>${a.name}</option>`)}
      </select>
    `;
    }
    _renderDeviceRows() {
        const rows = this._filteredDevices();
        if (rows.length === 0) {
            return b `<div class="empty">
        ${this._showAll
                ? "No devices match the current filter."
                : "Every device has an Area assigned. Toggle Show all to reassign."}
      </div>`;
        }
        return b `
      <table>
        <colgroup>
          <col class="col-name" />
          <col class="col-meta" />
          <col class="col-current" />
          <col class="col-new" />
        </colgroup>
        <thead>
          <tr>
            <th>Device</th>
            <th>Manufacturer / Model</th>
            <th>Current area</th>
            <th>New area</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((d) => b `
              <tr>
                <td class="name">${this._deviceLabel(d)}</td>
                <td class="meta">
                  ${d.manufacturer ?? ""}${d.model ? ` · ${d.model}` : ""}
                </td>
                <td class="current">
                  ${d.area_id
            ? this._areaNameById(d.area_id)
            : b `<em>none</em>`}
                </td>
                <td>${this._renderAreaPicker(`device:${d.id}`, d.area_id)}</td>
              </tr>
            `)}
        </tbody>
      </table>
    `;
    }
    _renderEntityRows() {
        const rows = this._filteredEntities();
        if (rows.length === 0) {
            return b `<div class="empty">
        ${this._showAll
                ? "No entities match the current filter."
                : "Every entity has an Area (directly or via its device). Toggle Show all to reassign."}
      </div>`;
        }
        return b `
      <table>
        <colgroup>
          <col class="col-name" />
          <col class="col-meta" />
          <col class="col-current" />
          <col class="col-new" />
        </colgroup>
        <thead>
          <tr>
            <th>Entity</th>
            <th>Device</th>
            <th>Current area</th>
            <th>New area</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map((e) => {
            const dev = e.device_id
                ? this._devices.find((d) => d.id === e.device_id)
                : undefined;
            const effectiveArea = e.area_id ?? dev?.area_id ?? null;
            return b `
              <tr>
                <td class="name">
                  <div>${this._entityLabel(e)}</div>
                  <div class="meta">${e.entity_id}</div>
                </td>
                <td class="meta">${dev ? this._deviceLabel(dev) : "—"}</td>
                <td class="current">
                  ${effectiveArea
                ? b `${this._areaNameById(effectiveArea)}
                        ${dev?.area_id && !e.area_id
                    ? b `<span class="cascade">(from device)</span>`
                    : A}`
                : b `<em>none</em>`}
                </td>
                <td>
                  ${this._renderAreaPicker(`entity:${e.entity_id}`, e.area_id)}
                </td>
              </tr>
            `;
        })}
        </tbody>
      </table>
    `;
    }
    render() {
        if (!this.open)
            return A;
        const pendingCount = this._pending.size;
        return b `
      <div class="backdrop" @click=${this._onClose}>
        <div class="dialog" @click=${(e) => e.stopPropagation()}>
          <div class="header">
            <div class="title">📍 Bulk assign areas</div>
            <button class="close" aria-label="Close" @click=${this._onClose}>
              ×
            </button>
          </div>
          <div class="body">
            ${this._error
            ? b `<div class="error">${this._error}</div>`
            : A}
            ${this._savedCount > 0
            ? b `<div class="success">
                  <div class="success-headline">
                    ✓ Saved ${this._savedCount} assignment${this._savedCount === 1 ? "" : "s"}.
                  </div>
                  ${this._savedAssignments.length > 0
                ? b `<ul class="success-summary">
                        ${this._savedAssignments.map((a) => b `<li>
                            <span class="sa-label">${a.label}</span>
                            <span class="sa-arrow">→</span>
                            <span class="sa-area">${a.area_name}</span>
                          </li>`)}
                      </ul>`
                : A}
                </div>`
            : A}
            ${this._failedRows.length > 0
            ? b `<div class="error">
                  ${this._failedRows.length} row${this._failedRows.length === 1 ? "" : "s"} failed to save:
                  <ul>
                    ${this._failedRows.map((r) => b `<li>${r}</li>`)}
                  </ul>
                </div>`
            : A}
            <div class="toolbar">
              <div class="tabs">
                <button
                  class="tab ${this._tab === "devices" ? "active" : ""}"
                  @click=${() => (this._tab = "devices")}
                >
                  Devices
                </button>
                <button
                  class="tab ${this._tab === "entities" ? "active" : ""}"
                  @click=${() => (this._tab = "entities")}
                >
                  Entities
                </button>
              </div>
              <div class="filters">
                <input
                  type="search"
                  placeholder="Filter by name…"
                  .value=${this._filter}
                  @input=${(e) => (this._filter = e.target.value)}
                />
                ${this._tab === "devices"
            ? b `
                      <select
                        class="filter-select"
                        .value=${this._filterManufacturer}
                        @change=${(e) => (this._filterManufacturer = e.target.value)}
                      >
                        <option value="">All manufacturers</option>
                        ${this._availableManufacturers().map((m) => b `<option value=${m}>${m}</option>`)}
                      </select>
                    `
            : b `
                      <select
                        class="filter-select"
                        .value=${this._filterIntegration}
                        @change=${(e) => (this._filterIntegration = e.target.value)}
                      >
                        <option value="">All integrations</option>
                        ${this._availableIntegrations().map((i) => b `<option value=${i}>${i}</option>`)}
                      </select>
                      <select
                        class="filter-select"
                        .value=${this._filterDomain}
                        @change=${(e) => (this._filterDomain = e.target.value)}
                      >
                        <option value="">All types</option>
                        ${this._availableDomains().map((d) => b `<option value=${d}>${d}</option>`)}
                      </select>
                    `}
                <label class="show-all">
                  <input
                    type="checkbox"
                    .checked=${this._showAll}
                    @change=${(e) => (this._showAll = e.target.checked)}
                  />
                  Show all (incl. already assigned)
                </label>
              </div>
            </div>
            ${this._loading
            ? b `<div class="empty">Loading registries…</div>`
            : this._tab === "devices"
                ? this._renderDeviceRows()
                : this._renderEntityRows()}
            <div class="hint">
              Need a new area first?
              <a href="/config/areas/dashboard">Create one in
                Settings → Areas</a>, then re-open this dialog.
            </div>
          </div>
          <div class="footer">
            <button
              class="btn"
              @click=${this._onClose}
              ?disabled=${this._saving}
            >
              ${pendingCount > 0 ? "Cancel" : "Close"}
            </button>
            <button
              class="btn primary"
              @click=${this._save}
              ?disabled=${pendingCount === 0 || this._saving}
            >
              ${this._saving
            ? "Saving…"
            : pendingCount > 0
                ? `Save ${pendingCount} change${pendingCount === 1 ? "" : "s"}`
                : "No changes"}
            </button>
          </div>
        </div>
      </div>
    `;
    }
    static { this.styles = i$3 `
    :host {
      /* All styling via HA CSS variables — keeps this component
         portable to HA core's frontend. */
      --bulk-row-bg: var(--card-background-color, #fff);
      --bulk-row-alt: var(--secondary-background-color, #f7f7f7);
    }
    .backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
    }
    .dialog {
      width: min(960px, 96vw);
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #212121);
      border-radius: 8px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }
    .header {
      padding: 14px 18px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
    }
    .title {
      font-size: 1.15em;
      font-weight: 500;
    }
    .close {
      background: none;
      border: none;
      font-size: 1.6em;
      cursor: pointer;
      color: var(--secondary-text-color);
    }
    .body {
      flex: 1;
      overflow: auto;
      padding: 14px 18px;
    }
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
      flex-wrap: wrap;
    }
    .tabs {
      display: flex;
      gap: 6px;
    }
    .tab {
      background: transparent;
      border: 1px solid var(--divider-color, #e0e0e0);
      padding: 6px 12px;
      border-radius: 16px;
      cursor: pointer;
      font-size: 0.95em;
      color: var(--secondary-text-color);
    }
    .tab.active {
      background: var(--primary-color, #4c6ef5);
      color: var(--text-primary-color, #fff);
      border-color: var(--primary-color, #4c6ef5);
    }
    .filters {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .filters input[type="search"] {
      padding: 6px 10px;
      border-radius: 4px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color);
      min-width: 180px;
    }
    .filter-select {
      padding: 6px 10px;
      border-radius: 4px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color);
      min-width: 130px;
    }
    .show-all {
      font-size: 0.9em;
      color: var(--secondary-text-color);
      cursor: pointer;
      user-select: none;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.92em;
      table-layout: fixed;
    }
    /* v1.2.14: explicit column widths so the "New area" picker has
       room for "Pick area…" + the longest area name without truncating
       to "pick an are". Manufacturer column wraps text rather than
       eating the picker's column. */
    .col-name { width: 26%; }
    .col-meta { width: 30%; }
    .col-current { width: 14%; }
    .col-new { width: 30%; }
    td.meta {
      overflow: hidden;
      text-overflow: ellipsis;
    }
    th {
      text-align: left;
      padding: 8px 10px;
      border-bottom: 1px solid var(--divider-color, #e0e0e0);
      font-weight: 500;
      color: var(--secondary-text-color);
    }
    td {
      padding: 8px 10px;
      border-bottom: 1px solid var(--divider-color, #f0f0f0);
      vertical-align: top;
    }
    tbody tr:nth-child(even) {
      background: var(--bulk-row-alt);
    }
    td.name {
      font-weight: 500;
    }
    td.meta,
    div.meta {
      color: var(--secondary-text-color);
      font-size: 0.9em;
    }
    td.current em {
      color: var(--secondary-text-color);
      font-style: italic;
    }
    .cascade {
      font-size: 0.85em;
      color: var(--secondary-text-color);
      margin-left: 4px;
    }
    .area-picker {
      width: 100%;
      padding: 5px 8px;
      border-radius: 4px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color);
    }
    .empty {
      padding: 32px 12px;
      text-align: center;
      color: var(--secondary-text-color);
      font-style: italic;
    }
    .hint {
      margin-top: 16px;
      padding: 10px 12px;
      background: var(--secondary-background-color, #f5f5f5);
      border-radius: 4px;
      font-size: 0.88em;
      color: var(--secondary-text-color);
    }
    .hint a {
      color: var(--primary-color, #4c6ef5);
    }
    .error {
      margin-bottom: 12px;
      padding: 10px 12px;
      background: rgba(244, 67, 54, 0.08);
      border-left: 3px solid var(--error-color, #c62828);
      border-radius: 4px;
      color: var(--primary-text-color);
      font-size: 0.92em;
    }
    .success-headline {
      font-weight: 500;
    }
    .success-summary {
      margin: 8px 0 0 0;
      padding: 0;
      list-style: none;
      max-height: 200px;
      overflow-y: auto;
      font-size: 0.88em;
    }
    .success-summary li {
      display: flex;
      gap: 8px;
      padding: 4px 0;
      border-top: 1px solid rgba(76, 175, 80, 0.15);
    }
    .success-summary li:first-child {
      border-top: none;
      margin-top: 4px;
    }
    .sa-label {
      font-weight: 500;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .sa-arrow {
      color: var(--secondary-text-color);
    }
    .sa-area {
      flex: 1;
      color: var(--success-color, #2e7d32);
    }
    .success {
      margin-bottom: 12px;
      padding: 10px 12px;
      background: rgba(76, 175, 80, 0.12);
      border-left: 3px solid var(--success-color, #4caf50);
      border-radius: 4px;
      color: var(--primary-text-color);
      font-size: 0.92em;
    }
    .footer {
      padding: 12px 18px;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      border-top: 1px solid var(--divider-color, #e0e0e0);
      background: var(--secondary-background-color, #fafafa);
    }
    .btn {
      padding: 8px 16px;
      border-radius: 4px;
      border: 1px solid var(--divider-color, #e0e0e0);
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color);
      cursor: pointer;
      font-size: 0.95em;
    }
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn.primary {
      background: var(--primary-color, #4c6ef5);
      color: var(--text-primary-color, #fff);
      border-color: var(--primary-color, #4c6ef5);
    }
  `; }
};
__decorate([
    n({ attribute: false })
], BulkAreaAssignDialog.prototype, "hass", void 0);
__decorate([
    n({ type: Boolean, reflect: true })
], BulkAreaAssignDialog.prototype, "open", void 0);
__decorate([
    r()
], BulkAreaAssignDialog.prototype, "_tab", void 0);
__decorate([
    r()
], BulkAreaAssignDialog.prototype, "_areas", void 0);
__decorate([
    r()
], BulkAreaAssignDialog.prototype, "_devices", void 0);
__decorate([
    r()
], BulkAreaAssignDialog.prototype, "_entities", void 0);
__decorate([
    r()
], BulkAreaAssignDialog.prototype, "_pending", void 0);
__decorate([
    r()
], BulkAreaAssignDialog.prototype, "_loading", void 0);
__decorate([
    r()
], BulkAreaAssignDialog.prototype, "_saving", void 0);
__decorate([
    r()
], BulkAreaAssignDialog.prototype, "_error", void 0);
__decorate([
    r()
], BulkAreaAssignDialog.prototype, "_savedCount", void 0);
__decorate([
    r()
], BulkAreaAssignDialog.prototype, "_failedRows", void 0);
__decorate([
    r()
], BulkAreaAssignDialog.prototype, "_savedAssignments", void 0);
__decorate([
    r()
], BulkAreaAssignDialog.prototype, "_showAll", void 0);
__decorate([
    r()
], BulkAreaAssignDialog.prototype, "_filter", void 0);
__decorate([
    r()
], BulkAreaAssignDialog.prototype, "_filterIntegration", void 0);
__decorate([
    r()
], BulkAreaAssignDialog.prototype, "_filterManufacturer", void 0);
__decorate([
    r()
], BulkAreaAssignDialog.prototype, "_filterDomain", void 0);
BulkAreaAssignDialog = __decorate([
    t("bulk-area-assign-dialog")
], BulkAreaAssignDialog);

const CARD_PROTOCOL_VERSION = 1;
const DEFAULT_MAX_ROWS = 8;
class HaInsightsCard extends i {
    constructor() {
        super(...arguments);
        this._config = { type: "custom:ha-insights-card" };
        this._insights = [];
        // v1.2.9: `_loading` removed. It was a lifecycle flag that could
        // get stuck (WS hang, missed update, etc.) and produced a blank
        // "Loading…" curtain — the worst kind of UX failure (you don't
        // know if it's broken or just slow). The card now renders based
        // on the data it actually has: insights, _hello (server contact),
        // _error (visible failure). Empty data + no error = empty state
        // with a "Run scan now" CTA, not a stuck curtain. Mirrors how
        // every native HA panel handles this — they never show "Loading…"
        // as a terminal state, only as a transient indicator at most.
        // True while a scan is in flight — render method shows a "Scanning…"
        // curtain instead of the live-mutating insight list. Cleared by the
        // ha-insights-refresh handler (which also fetches the canonical
        // post-scan view).
        this._scanInProgress = false;
        this._explainBusy = false;
        // Per-insight busy flag for the audit_suggest LLM call. Distinct
        // from Refine so an in-flight suggest on one row doesn't disable
        // refine on another.
        this._auditSuggestBusy = null;
        this._ttsBusy = false;
        this._refineBusy = false;
        /** v0.9 phase 6: ephemeral hypothesis text per anomaly id. Not persisted. */
        this._hypothesisById = new Map();
        this._hypothesizeBusy = false;
        /** v1.0 RC #2: per-insight Conversation API thread id, so consecutive
         * Refines on the same insight maintain agent context. Cleared on
         * Apply / Keep Original / explicit "Reset conversation". */
        this._refineConversationById = new Map();
        /** v1.0 RC #2: per-insight Refine turn counter for UI display. */
        this._refineTurnsById = new Map();
        this._testBusy = false;
        this._scanBusy = false;
        /** Per-insight refined preview held in card state until Apply or Keep Original. */
        this._refinedById = new Map();
        /** Per-insight alias/description rename edits, applied as payload_override on Apply. */
        this._renameEdits = new Map();
        /** Per-insight in-progress follow-up feedback for the next Refine call. */
        this._feedbackById = new Map();
        /** Per-insight free-form JSON edits to the payload (v0.8 phase 3). */
        this._payloadEditsById = new Map();
        /** Set of insight ids currently in edit mode. */
        this._editingPayloadFor = new Set();
        /** Per-insight parse error from the last Apply attempt (e.g. "Invalid JSON"). */
        this._payloadParseErrorById = new Map();
        /** Per-insight redaction preview state — shown when user clicks "What gets sent?" */
        this._previewById = new Map();
        this._previewBusy = false;
        /** v1.1 Refine-existing-automation modal state. Separate from the
         *  per-insight dialog because we're not in an insight context here —
         *  user clicked the ✏️ icon on a 🔁/🤖 pill. Carries the loaded
         *  automation, the in-progress feedback, and the refined diff after
         *  the LLM round-trip. Set undefined while closed. */
        /** v1.1: insight ids whose cohort_members list is currently shown
         *  expanded. Click "▸ show N" to toggle. Per-row state; not persisted. */
        this._expandedCohorts = new Set();
        /** v1.2.6 — Open flag for the standalone <bulk-area-assign-dialog>
         *  component. State lives INSIDE the dialog (so it's portable to HA
         *  core); the card just toggles the open flag. */
        this._bulkAreaAssignOpen = false;
        /**
         * v0.5: rows that fit in the card's currently-rendered height. Updated
         * by ResizeObserver. Used as the row cap when the user hasn't set
         * max_rows explicitly. -1 means "not yet measured; use the default."
         */
        this._autoMaxRows = -1;
        // Populated by _filtered() — the total count BEFORE the max_rows
        // cap is applied. Used by _renderCompactTile so the dashboard tile
        // reports the true number of insights even when the cap clips the
        // rendered list to e.g. 1 row.
        this._totalFilteredCount = 0;
        // v1.2.13: re-entry guard for `_wire()`. Both connectedCallback (the
        // re-mount recovery added in v1.2.13) and `updated(changedProps)` can
        // race to fire `_wire()` within the same microtask if Lit reassigns
        // hass during element re-attachment. Without a guard we'd open two
        // subscriptions, leak the first `_unsub`, and double-handle events.
        this._wiring = false;
        this._keydownHandler = (e) => {
            if (e.key === "Escape" && this._dialogId) {
                this._closeDialog();
            }
        };
        this._scanStarted = () => {
            this._scanInProgress = true;
        };
        this._refreshFromEvent = async () => {
            // v1.2.9: no more _loading flag to manage. Render is data-driven
            // (insights / _hello / _error); this method just updates the
            // underlying data, render handles the rest. `_scanInProgress`
            // stays because it's a legitimate transient indicator a scan is
            // running RIGHT NOW (user clicked Run scan, results coming).
            if (!this.hass) {
                this._scanInProgress = false;
                return;
            }
            // Refresh hello in parallel so the footer + protocol-skew banner
            // reflect the latest deploy. Non-fatal — list-refresh is the
            // user-visible bit.
            try {
                this._hello = await this._withTimeout(this.hass.connection.sendMessagePromise({
                    type: "home_insights/hello",
                    card_version: "0.8.2",
                }), "home_insights/hello");
            }
            catch (err) {
                console.debug("ha-insights-card hello refresh failed", err);
            }
            // List is the load-bearing call. If it fails AND we have no
            // existing insights to fall back to, surface the error so the
            // user knows the card is alive and explains itself. If we DO
            // have prior insights, keep them visible — stale is better than
            // blank.
            try {
                const result = await this._withTimeout(this.hass.connection.sendMessagePromise({
                    type: "home_insights/list",
                    include_applied: Boolean(this._config.include_applied),
                }), "home_insights/list");
                this._insights = result.insights ?? [];
                this._error = undefined;
            }
            catch (err) {
                console.warn("ha-insights-card refresh-from-event failed", err);
                if (this._insights.length === 0) {
                    this._error = `Could not refresh insights: ${this._asMessage(err)}`;
                }
            }
            finally {
                this._scanInProgress = false;
            }
        };
    }
    // v1.2.9: `_wired` removed. Used to gate the initial fetch, but
    // it was also a "we've talked to HA" signal we tracked manually —
    // which can drift from reality (subscription died but flag still
    // says wired). Replaced by checking `this._hello` directly: the
    // hello-response object IS the signal that we successfully talked
    // to the integration. If hello is undefined, we haven't fetched
    // yet; if it's set, we have. Single source of truth, can't drift.
    //
    // `_resumeCleanups` + `_installResumeHandlers` removed. HA's
    // home-assistant-js-websocket auto-reconnects on WS drop and
    // auto-resubscribes subscribeMessage handles. The visibility-
    // change handler we added in v1.2.2 was working around a problem
    // that only appeared because our `_loading` flag could stick —
    // with `_loading` gone, there's no stuck state to recover from.
    // Subscription events flow back in naturally on WS resume.
    static { this.styles = i$3 `
    :host {
      display: block;
    }
    ha-card {
      padding: 0;
      overflow: hidden;
    }
    .header {
      padding: 12px 16px 8px;
      border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      display: flex;
      align-items: flex-start;
      gap: 12px;
    }
    .header .titles {
      flex: 1;
      min-width: 0;
    }
    .title {
      font-size: 1.1em;
      font-weight: 500;
    }
    .subtitle {
      font-size: 0.8em;
      color: var(--secondary-text-color);
      margin-top: 2px;
    }
    .header a.view-all {
      flex-shrink: 0;
      font-size: 0.85em;
      color: var(--primary-color);
      text-decoration: none;
      padding: 4px 8px;
      border-radius: 4px;
      transition: background 120ms;
    }
    .header a.view-all:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }
    /* v1.2.3 — "Showing N of M — +X more →" footer for capped tiles */
    .truncation-footer {
      display: block;
      padding: 8px 16px;
      text-align: center;
      font-size: 0.85em;
      color: var(--primary-color);
      text-decoration: none;
      border-top: 1px solid var(--divider-color, #e0e0e0);
      transition: background 120ms;
    }
    .truncation-footer:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }
    /* Compact tile: single row, full-width clickable */
    .compact-tile {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 18px 20px;
      cursor: pointer;
      transition: background 120ms;
      text-decoration: none;
      color: inherit;
    }
    .compact-tile:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
    }
    .compact-tile .count {
      font-size: 1.4em;
      font-weight: 500;
    }
    .compact-tile .label {
      color: var(--secondary-text-color);
      font-size: 0.85em;
      margin-top: 2px;
    }
    .compact-tile .arrow {
      font-size: 1.2em;
      color: var(--primary-color);
    }
    .skew-banner {
      background: var(--warning-color, #ff9800);
      color: white;
      padding: 8px 16px;
      font-size: 0.85em;
    }
    .empty,
    .error {
      padding: 24px 16px;
      text-align: center;
      color: var(--secondary-text-color);
    }
    .empty-actions {
      margin-top: 12px;
      display: flex;
      gap: 8px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .empty-scanning {
      padding: 56px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
    }
    .empty-scanning .empty-sub {
      color: var(--secondary-text-color);
      font-size: 0.85em;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid var(--divider-color, rgba(0, 0, 0, 0.18));
      border-top-color: var(--primary-color);
      border-radius: 50%;
      animation: ha-insights-spin 0.8s linear infinite;
    }
    @keyframes ha-insights-spin {
      to {
        transform: rotate(360deg);
      }
    }
    .empty-actions a,
    .empty-actions button {
      background: none;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.18));
      color: var(--primary-text-color);
      padding: 6px 14px;
      border-radius: 6px;
      cursor: pointer;
      font: inherit;
      font-size: 0.9em;
      text-decoration: none;
    }
    .empty-actions a:hover,
    .empty-actions button:hover:not(:disabled) {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }
    .empty-actions button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .error {
      color: var(--error-color, #f44336);
    }
    .toast {
      background: var(--success-color, #4caf50);
      color: white;
      padding: 8px 16px;
      font-size: 0.85em;
    }
    .error-banner {
      background: var(--error-color, #f44336);
      color: white;
      padding: 10px 16px;
      font-size: 0.85em;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }
    .error-banner button {
      background: rgba(255, 255, 255, 0.18);
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      padding: 4px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.85em;
      flex-shrink: 0;
    }
    .error-banner button:hover {
      background: rgba(255, 255, 255, 0.28);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 0.75em;
      font-weight: 500;
      vertical-align: middle;
    }
    .badge-off {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.08));
      color: var(--secondary-text-color);
    }
    .badge-local {
      background: rgba(76, 175, 80, 0.18);
      color: var(--success-color, #2e7d32);
    }
    .badge-cloud {
      background: rgba(255, 152, 0, 0.18);
      color: var(--warning-color, #e65100);
    }
    /* Group section header (v0.7) */
    .group-header {
      padding: 10px 16px 4px;
      font-size: 0.78em;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--secondary-text-color);
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.02));
      border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.06));
    }
    .row {
      padding: 12px 16px;
      border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.08));
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: background 120ms;
    }
    .row:last-child {
      border-bottom: none;
    }
    .row:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
    }
    .row-title {
      font-weight: 500;
    }
    .row-meta {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      font-size: 0.8em;
      color: var(--secondary-text-color);
    }
    .pill {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      padding: 2px 8px;
      border-radius: 10px;
    }
    /* v1.1: pill + ✏️ Refine action button cluster — keeps the pill
       and its sibling button visually adjacent without disturbing
       the row's existing pill flow. */
    .automation-pill-group {
      display: inline-flex;
      align-items: center;
      gap: 2px;
    }
    .pill-action {
      background: transparent;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      padding: 1px 6px;
      border-radius: 10px;
      cursor: pointer;
      font-size: 0.95em;
      color: var(--secondary-text-color);
    }
    .pill-action:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.06));
    }
    /* Multi-link pill expander. <details> handles open/close; we only
       need to suppress the default disclosure triangle (Firefox) and
       style the popout list. */
    .automation-pill-details {
      display: inline-block;
      vertical-align: middle;
    }
    .automation-pill-details > summary {
      display: inline-block;
    }
    .automation-pill-details > summary::-webkit-details-marker {
      display: none;
    }
    .automation-pill-menu {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 6px;
      padding: 8px 10px;
      background: var(--card-background-color, white);
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      min-width: 220px;
      max-width: 380px;
    }
    .automation-pill-row {
      display: flex;
      align-items: center;
      gap: 6px;
      justify-content: space-between;
    }
    .automation-pill-link {
      color: var(--primary-color);
      text-decoration: none;
      font-size: 0.9em;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .automation-pill-link:hover {
      text-decoration: underline;
    }
    /* v1.1 audit findings — collapsible per-observation list shown
       under audit-row titles. Indented + secondary background so it
       reads as supporting detail, not another row. */
    .audit-findings {
      margin: 6px 0 8px 14px;
      padding: 8px 12px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
      border-left: 3px solid var(--primary-color);
      border-radius: 0 6px 6px 0;
      font-size: 0.9em;
    }
    .audit-findings ul {
      margin: 0;
      padding-left: 18px;
    }
    .audit-findings li {
      margin: 2px 0;
    }
    .audit-findings .audit-fixes {
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px solid var(--divider-color, rgba(0, 0, 0, 0.08));
      color: var(--success-color, #2e7d32);
    }
    .audit-findings .audit-fixes strong {
      display: block;
      margin-bottom: 2px;
    }
    /* v1.1: cohort expansion — list of merged entity_ids */
    .cohort-members {
      margin-top: 6px;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .cohort-member-chip {
      font-family: var(--code-font-family, monospace);
      font-size: 0.8em;
      padding: 2px 8px;
      border-radius: 4px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--secondary-text-color);
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .cohort-member-id {
      /* The entity_id keeps the monospace look from the parent */
    }
    .cohort-member-badge {
      font-family: var(--primary-font-family, sans-serif);
      font-size: 0.85em;
      padding: 1px 6px;
      border-radius: 10px;
    }
    .cohort-member-int {
      background: rgba(76, 110, 245, 0.15);
      color: var(--secondary-text-color);
    }
    .cohort-member-ext {
      background: rgba(255, 152, 0, 0.18);
      color: var(--warning-color, #e65100);
    }
    /* Confidence pill color coding (v0.7) */
    .pill.confidence-high {
      background: rgba(76, 175, 80, 0.18);
      color: var(--success-color, #2e7d32);
    }
    .pill.confidence-medium {
      background: rgba(255, 152, 0, 0.18);
      color: var(--warning-color, #e65100);
    }
    .pill.confidence-low {
      background: rgba(244, 67, 54, 0.15);
      color: var(--error-color, #c62828);
    }
    button.action {
      background: none;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.18));
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.85em;
      color: var(--primary-text-color);
    }
    button.action:hover:not(:disabled) {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }
    button.action:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    /* v0.8 phase 5: pulse animation on LLM-busy buttons so the user
       knows the round-trip is in flight (5-15s typical). Replaces the
       static "asking LLM…" text without changing the button copy. */
    @keyframes ha-insights-pulse {
      0%   { opacity: 0.55; }
      50%  { opacity: 1; }
      100% { opacity: 0.55; }
    }
    button.action.busy-pulse:disabled {
      opacity: 1;
      animation: ha-insights-pulse 1.4s ease-in-out infinite;
    }
    button.primary {
      background: var(--primary-color);
      color: var(--text-primary-color, white);
      border-color: var(--primary-color);
    }
    button.primary:hover:not(:disabled) {
      background: var(--dark-primary-color, var(--primary-color));
    }

    /* Modal dialog */
    .dialog-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 16px;
    }
    .dialog {
      background: var(--card-background-color, white);
      color: var(--primary-text-color);
      border-radius: 12px;
      width: 92vw;
      max-width: 900px;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }
    /* Wide variant for the diff modal — YAML needs horizontal room */
    .dialog.dialog-wide {
      max-width: min(1400px, 96vw);
    }
    /* Phone-size — modal eats the screen, and the diff panes stack
       vertically instead of splitting side-by-side */
    @media (max-width: 720px) {
      .dialog-backdrop {
        padding: 0;
      }
      .dialog,
      .dialog.dialog-wide {
        width: 100vw;
        max-width: 100vw;
        height: 100vh;
        max-height: 100vh;
        border-radius: 0;
      }
      .diff-grid {
        grid-template-columns: 1fr !important;
      }
      .diff-grid > .diff-pane {
        max-height: 45vh;
      }
      .diff-header {
        grid-template-columns: 1fr !important;
        gap: 4px !important;
      }
    }
    .dialog-header {
      padding: 16px 20px;
      border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }
    .dialog-title {
      font-size: 1.05em;
      font-weight: 500;
      line-height: 1.4;
    }
    .dialog-close {
      background: none;
      border: none;
      font-size: 1.6em;
      line-height: 1;
      cursor: pointer;
      color: var(--secondary-text-color);
      padding: 0 4px;
      flex-shrink: 0;
    }
    .dialog-close:hover {
      color: var(--primary-text-color);
    }
    .dialog-body {
      padding: 16px 20px;
      overflow-y: auto;
      flex: 1;
    }
    .dialog-body h4 {
      margin: 16px 0 8px;
      font-size: 0.9em;
    }
    .dialog-body h4:first-child {
      margin-top: 0;
    }
    .dialog-body pre {
      background: var(--code-background-color, rgba(0, 0, 0, 0.04));
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      overflow-y: auto;
      max-height: 360px;
      font-size: 0.85em;
      line-height: 1.5;
      margin: 0;
      white-space: pre;
    }
    .explanation {
      margin-top: 12px;
      padding: 12px;
      border-left: 3px solid var(--primary-color);
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.02));
      font-style: italic;
      line-height: 1.5;
    }
    .explain-row {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      flex-wrap: wrap;
    }

    /* v1.5.11 — Setup-guide dialog body for setup_quality insights. */
    .setup-steps {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 8px;
    }
    /* v1.2.16 — audit dialog body components */
    .audit-automation-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 12px;
      padding: 10px 12px;
      background: var(--secondary-background-color, #f5f5f5);
      border-radius: 6px;
    }
    .audit-automation-name {
      font-weight: 500;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .audit-advice {
      margin-top: 12px;
      padding: 8px 12px;
      background: var(--info-color-background, rgba(33, 150, 243, 0.08));
      border-left: 3px solid var(--info-color, #2196f3);
      border-radius: 4px;
      font-size: 0.92em;
      color: var(--primary-text-color);
    }
    .audit-findings {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .audit-finding {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 8px 0;
      border-top: 1px solid var(--divider-color, #e0e0e0);
    }
    .audit-finding:first-child {
      border-top: none;
    }
    .audit-finding-icon {
      flex: 0 0 auto;
      font-size: 1.1em;
      line-height: 1.3;
    }
    .audit-finding-text {
      flex: 1;
      line-height: 1.35;
    }
    .audit-finding-action {
      flex: 0 0 auto;
      font-size: 0.85em;
      color: var(--primary-color, #4c6ef5);
      text-decoration: none;
      white-space: nowrap;
      align-self: center;
    }
    .audit-finding-action:hover {
      text-decoration: underline;
    }
    .audit-entity-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    @media (max-width: 600px) {
      .audit-entity-grid {
        grid-template-columns: 1fr;
      }
    }
    .audit-entity-label {
      font-size: 0.85em;
      color: var(--secondary-text-color);
      font-weight: 500;
      margin-bottom: 4px;
    }
    .audit-entity-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .audit-entity-pill {
      padding: 3px 8px;
      background: var(--secondary-background-color, #f5f5f5);
      border-radius: 12px;
      font-size: 0.85em;
      font-family: var(--code-font-family, monospace);
    }
    .audit-entity-pill.is-silent {
      background: rgba(244, 67, 54, 0.08);
      color: var(--error-color, #c62828);
    }
    .audit-entity-pill .silent-dot {
      color: var(--error-color, #c62828);
    }
    .audit-related {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .audit-related-link {
      color: var(--primary-color, #4c6ef5);
      text-decoration: none;
      font-size: 0.92em;
    }
    .audit-related-link:hover {
      text-decoration: underline;
    }
    .audit-raw-payload {
      margin-top: 16px;
    }
    .audit-raw-payload summary {
      cursor: pointer;
      font-size: 0.85em;
      color: var(--secondary-text-color);
    }
    .audit-raw-payload pre {
      max-height: 240px;
      overflow: auto;
      font-size: 0.78em;
      background: var(--code-editor-background-color, var(--secondary-background-color, #f5f5f5));
      padding: 8px;
      border-radius: 4px;
      margin-top: 6px;
    }
    .setup-step {
      border: 1px solid var(--divider-color, #e0e0e0);
      border-left: 4px solid var(--divider-color, #e0e0e0);
      border-radius: 6px;
      padding: 10px 12px;
      background: var(--card-background-color, #fff);
    }
    .setup-step--ok { border-left-color: var(--success-color, #4caf50); }
    .setup-step--warn { border-left-color: var(--warning-color, #ef6c00); }
    .setup-step--todo { border-left-color: var(--error-color, #c62828); }
    .setup-step-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
    }
    .setup-step-tier {
      font-size: 0.85em;
      padding: 2px 8px;
      border-radius: 12px;
      background: var(--secondary-background-color, #f5f5f5);
      color: var(--secondary-text-color, #555);
      white-space: nowrap;
    }
    .setup-step-name {
      font-size: 1em;
      color: var(--primary-text-color);
    }
    .setup-step-advice {
      margin-top: 6px;
      color: var(--secondary-text-color, #555);
      font-size: 0.92em;
      line-height: 1.4;
    }
    .setup-step-scenarios {
      margin-top: 8px;
      font-size: 0.9em;
    }
    .setup-step-scenarios summary {
      cursor: pointer;
      color: var(--primary-color);
      user-select: none;
    }
    .setup-step-scenarios ul {
      margin: 6px 0 0;
      padding-left: 18px;
      color: var(--secondary-text-color, #555);
    }
    .setup-step-scenarios li {
      margin: 2px 0;
    }
    .setup-step-action {
      margin-top: 10px;
    }
    .setup-step-action .action {
      display: inline-block;
      text-decoration: none;
    }
    .setup-step-note {
      margin-top: 8px;
      padding: 6px 8px;
      background: var(--secondary-background-color, #f5f5f5);
      border-radius: 4px;
      font-size: 0.88em;
      color: var(--secondary-text-color, #555);
      font-style: italic;
    }
    /* Banner shown when the open setup_quality insight is from an
       older detector version (no setup_steps in the payload) — gives
       the user a real button to re-scan instead of dead text. */
    .setup-stale-banner {
      margin-top: 16px;
      padding: 12px;
      border-radius: 6px;
      background: var(--warning-background-color, rgba(255, 152, 0, 0.08));
      border-left: 3px solid var(--warning-color, #ef6c00);
      font-size: 0.92em;
      color: var(--primary-text-color);
    }
    .setup-stale-banner strong {
      display: block;
      margin-bottom: 4px;
    }
    .setup-stale-action {
      margin-top: 10px;
    }

    .refined-banner {
      padding: 10px 12px;
      background: rgba(76, 175, 80, 0.15);
      border-left: 3px solid var(--success-color, #4caf50);
      border-radius: 4px;
      margin-bottom: 12px;
      font-size: 0.9em;
    }
    .refined-banner strong {
      display: block;
      margin-bottom: 4px;
      color: var(--success-color, #2e7d32);
    }
    .diff-list {
      list-style: none;
      padding: 0;
      margin: 8px 0 0;
      font-family: var(--code-font-family, monospace);
      font-size: 0.85em;
    }
    .diff-list li {
      padding: 2px 0;
    }
    .diff-add { color: var(--success-color, #2e7d32); }
    .diff-remove { color: var(--error-color, #c62828); }
    .diff-change { color: var(--warning-color, #ef6c00); }

    /* Side-by-side YAML compare for refined preview */
    .compare {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin: 12px 0;
    }
    .compare-col h5 {
      margin: 0 0 6px;
      font-size: 0.8em;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--secondary-text-color);
    }
    .compare-col pre {
      max-height: 300px;
      overflow: auto;
      margin: 0;
      padding: 10px;
      background: var(--code-background-color, rgba(0, 0, 0, 0.04));
      border-radius: 6px;
      font-size: 0.78em;
      line-height: 1.4;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .compare-col.refined pre {
      border-left: 3px solid var(--success-color, #4caf50);
    }
    @media (max-width: 720px) {
      .compare {
        grid-template-columns: 1fr;
      }
    }

    /* Redaction preview ("What gets sent?") panel */
    .preview {
      margin-top: 12px;
      padding: 10px 12px;
      border-left: 3px solid var(--info-color, #2196f3);
      background: rgba(33, 150, 243, 0.08);
      border-radius: 4px;
    }
    .preview-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .preview-header strong {
      color: var(--info-color, #1565c0);
    }
    .preview-stats {
      font-size: 0.8em;
      color: var(--secondary-text-color);
      margin-bottom: 8px;
    }
    .preview-stats span {
      margin-right: 12px;
    }
    .preview pre {
      max-height: 240px;
      overflow: auto;
      margin: 0;
      padding: 8px;
      background: var(--code-background-color, rgba(0, 0, 0, 0.04));
      border-radius: 4px;
      font-size: 0.78em;
      line-height: 1.4;
      white-space: pre-wrap;
      word-break: break-word;
    }
    .preview-pseudonyms {
      margin-top: 8px;
      font-size: 0.78em;
      color: var(--secondary-text-color);
    }
    .preview-pseudonyms code {
      font-family: var(--code-font-family, monospace);
      background: var(--code-background-color, rgba(0, 0, 0, 0.04));
      padding: 1px 4px;
      border-radius: 3px;
    }

    /* Follow-up feedback for re-refine */
    .feedback {
      margin-top: 12px;
      padding: 10px 12px;
      border: 1px dashed var(--divider-color, rgba(0, 0, 0, 0.2));
      border-radius: 6px;
    }
    .feedback h5 {
      margin: 0 0 6px;
      font-size: 0.85em;
      color: var(--secondary-text-color);
    }
    .feedback textarea {
      width: 100%;
      box-sizing: border-box;
      min-height: 56px;
      padding: 6px 8px;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.18));
      border-radius: 4px;
      font: inherit;
      background: var(--card-background-color, white);
      color: var(--primary-text-color);
      resize: vertical;
    }
    .feedback textarea:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    /* Inline payload editor (v0.8 phase 3) */
    .payload-edit {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-bottom: 6px;
    }
    .payload-edit button {
      background: none;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.18));
      color: var(--primary-text-color);
      padding: 4px 10px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8em;
    }
    .payload-edit button:hover {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }
    textarea.payload-editor {
      width: 100%;
      box-sizing: border-box;
      min-height: 240px;
      max-height: 360px;
      padding: 10px 12px;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.18));
      border-radius: 6px;
      font-family: var(--code-font-family, "SFMono-Regular", Consolas, monospace);
      font-size: 0.82em;
      line-height: 1.5;
      background: var(--code-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color);
      resize: vertical;
      white-space: pre;
    }
    textarea.payload-editor:focus {
      outline: none;
      border-color: var(--primary-color);
    }
    textarea.payload-editor.error {
      border-color: var(--error-color, #c62828);
    }
    .payload-error {
      margin-top: 6px;
      padding: 8px 10px;
      background: rgba(244, 67, 54, 0.10);
      color: var(--error-color, #c62828);
      border-radius: 4px;
      font-size: 0.85em;
    }

    /* Rename inputs */
    .rename {
      margin-top: 12px;
      padding: 10px 12px;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      border-radius: 6px;
    }
    .rename h4 {
      margin: 0 0 8px;
      font-size: 0.85em;
      color: var(--secondary-text-color);
    }
    .rename label {
      display: block;
      font-size: 0.78em;
      color: var(--secondary-text-color);
      margin: 6px 0 2px;
    }
    .rename input,
    .rename textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 6px 8px;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.18));
      border-radius: 4px;
      font: inherit;
      background: var(--card-background-color, white);
      color: var(--primary-text-color);
    }
    .rename textarea {
      resize: vertical;
      min-height: 48px;
    }
    .rename input:focus,
    .rename textarea:focus {
      outline: none;
      border-color: var(--primary-color);
    }

    /* Test-actions result panel */
    .test-results {
      margin-bottom: 12px;
      padding: 10px 12px;
      border-radius: 6px;
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      border-left: 3px solid var(--primary-color);
    }
    .test-results.ok {
      border-left-color: var(--success-color, #4caf50);
      background: rgba(76, 175, 80, 0.10);
    }
    .test-results.fail {
      border-left-color: var(--error-color, #f44336);
      background: rgba(244, 67, 54, 0.08);
    }
    .test-results-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      font-weight: 500;
    }
    .test-results-close {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 1.1em;
      color: var(--secondary-text-color);
      line-height: 1;
      padding: 0 4px;
    }
    .test-results ul {
      list-style: none;
      padding: 0;
      margin: 6px 0 0;
      font-size: 0.88em;
    }
    .test-results li {
      padding: 4px 0;
      display: flex;
      gap: 8px;
      align-items: flex-start;
    }
    .test-results .icon {
      flex-shrink: 0;
      width: 1.1em;
      text-align: center;
    }
    .test-results .icon-ok { color: var(--success-color, #2e7d32); }
    .test-results .icon-fail { color: var(--error-color, #c62828); }
    .test-results .icon-skip { color: var(--secondary-text-color); }
    .test-results .meta {
      color: var(--secondary-text-color);
      font-size: 0.85em;
      margin-top: 2px;
    }
    .test-results-error {
      color: var(--error-color, #c62828);
      font-size: 0.85em;
      margin-top: 2px;
    }
    .dialog-footer {
      padding: 12px 20px;
      border-top: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      flex-wrap: wrap;
    }
  `; }
    setConfig(config) {
        if (!config) {
            throw new Error("Invalid configuration");
        }
        this._config = config;
    }
    /** Declarative-binding alias for setConfig — lets parents do
     *  `<ha-insights-card .config=${cfg}>` and have Lit reuse the same
     *  element across renders so the card preserves its state (open
     *  modal, in-flight refine, etc). The panel relies on this. */
    set config(value) {
        if (value)
            this.setConfig(value);
    }
    get config() {
        return this._config;
    }
    getCardSize() {
        return Math.min(this._insights.length, this._config.max_rows ?? DEFAULT_MAX_ROWS) + 2;
    }
    /** Lovelace hook — return a visual editor for Edit Card UI. */
    static async getConfigElement() {
        return document.createElement("ha-insights-card-editor");
    }
    /** Lovelace hook — sensible defaults when the user adds a fresh card. */
    static getStubConfig() {
        return {
            title: "HA Insights",
            min_confidence: 0.5,
        };
    }
    connectedCallback() {
        super.connectedCallback();
        window.addEventListener("keydown", this._keydownHandler);
        // Panel dispatches these around its Scan / Purge / Backfill flows
        // so we can show a clean loading state instead of the noisy
        // subscribe-stream rows piling up live + getting re-deduped at the end.
        window.addEventListener("ha-insights-scan-start", this._scanStarted);
        window.addEventListener("ha-insights-refresh", this._refreshFromEvent);
        this._resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                this._updateAutoMaxRows(entry.contentRect.height);
            }
        });
        this._resizeObserver.observe(this);
        // v1.2.13: re-wire on re-mount.
        //
        // Background: v1.2.9 made render `_hello`-gated and removed the
        // `_loading` flag — "data-driven render". `disconnectedCallback`
        // clears `_hello` so a fresh fetch fires on re-mount. The
        // `_wire()` trigger lives in `updated()` keyed on
        // `changedProps.has("hass")`.
        //
        // That works when HA's panel framework drops the element and
        // mounts a fresh one (Lit sets `hass` from scratch → "change").
        // BUT when the framework keeps the SAME element instance and
        // just toggles its connected state (e.g. tab switch / "back from
        // another app"), `hass` keeps its old reference and `updated()`
        // doesn't see a hass-change → `_wire()` never fires → card
        // renders the empty `!_hello` placeholder forever.
        //
        // The defensive recovery: if we have `hass` already AND no
        // `_hello`, fire `_wire()` now. Idempotent — `_wire()` short-
        // circuits if it's already running, and a successful run sets
        // `_hello` so the next reconnect cycle skips the work.
        if (this.hass && !this._hello) {
            void this._wire();
        }
    }
    /** v1.2.8 — timeout-wrap a WS promise so an unrecoverably-hanging
     *  call (post-tab-pause, connection in limbo) can't block the UI
     *  forever. Rejects with a typed error after `timeoutMs` so callers
     *  can show the user a real failure instead of "Loading…" forever.
     *  8s default — generous for a healthy WS, tight enough that users
     *  notice failures within their attention span. */
    static { this._WS_TIMEOUT_MS = 8_000; }
    _withTimeout(promise, label, timeoutMs = HaInsightsCard._WS_TIMEOUT_MS) {
        return Promise.race([
            promise,
            new Promise((_, reject) => window.setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs)),
        ]);
    }
    /** Approximate per-row height — title + meta + padding + border. */
    static { this.ROW_HEIGHT_PX = 72; }
    /** Header consumes a fixed slice; banners/toast eat into the body too. */
    static { this.HEADER_HEIGHT_PX = 60; }
    _updateAutoMaxRows(hostHeight) {
        const available = Math.max(0, hostHeight - HaInsightsCard.HEADER_HEIGHT_PX);
        const rows = Math.max(1, Math.floor(available / HaInsightsCard.ROW_HEIGHT_PX));
        if (rows !== this._autoMaxRows) {
            this._autoMaxRows = rows;
        }
    }
    updated(changedProps) {
        // v1.2.9: trigger initial fetch when hass first arrives. The
        // gate is `!this._hello` — if hello is undefined we haven't
        // successfully talked to the integration yet. Single source of
        // truth: hello-response IS the "we're connected" signal.
        if (changedProps.has("hass") && this.hass && !this._hello) {
            void this._wire();
        }
        if (changedProps.has("_toast") && this._toast) {
            window.clearTimeout(this._toastTimer);
            this._toastTimer = window.setTimeout(() => {
                this._toast = undefined;
            }, 2500);
        }
        if (changedProps.has("_dialogId")) {
            // Lock body scroll while modal is open so the dashboard underneath
            // doesn't move when users scroll the dialog body.
            document.body.style.overflow = this._dialogId ? "hidden" : "";
        }
        if (changedProps.has("_insights")) {
            // v1.1: emit an event the panel listens for so it can refresh its
            // chip-filter options + "Showing X of Y" counters. Bubbles +
            // composed so the panel parent receives it through the shadow DOM.
            this.dispatchEvent(new CustomEvent("insights-loaded", {
                detail: { insights: this._insights },
                bubbles: true,
                composed: true,
            }));
        }
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener("keydown", this._keydownHandler);
        window.removeEventListener("ha-insights-scan-start", this._scanStarted);
        window.removeEventListener("ha-insights-refresh", this._refreshFromEvent);
        // v1.2.9: resume-listener cleanup removed alongside the
        // visibility handler. Nothing to tear down besides the standard
        // subscribe handle + resize observer.
        document.body.style.overflow = "";
        this._unsub?.();
        this._unsub = undefined;
        // Clear `_hello` so a fresh element instance after a re-mount
        // (HA panel navigation cycle) treats itself as un-fetched and
        // re-runs the initial fetch via updated().
        this._hello = undefined;
        this._resizeObserver?.disconnect();
        this._resizeObserver = undefined;
    }
    async _wire() {
        if (!this.hass)
            return;
        if (this._wiring)
            return; // v1.2.13: re-entry guard
        this._wiring = true;
        // v1.2.8: every WS call gets a timeout. If the call hangs (post-
        // tab-resume, WS-reconnect-in-flight, slow integration startup),
        // we surface a real error after 8s instead of sitting on
        // "Loading…" forever.
        // v1.2.9: no _loading flag to clear. Failures set _error which
        // render() shows as a banner; subsequent retries clear _error
        // on success. The card always renders SOMETHING useful — never
        // a stuck curtain.
        try {
            try {
                this._hello = await this._withTimeout(this.hass.connection.sendMessagePromise({
                    type: "home_insights/hello",
                    card_version: "0.8.2",
                }), "home_insights/hello");
            }
            catch (err) {
                this._error = `Integration not reachable: ${this._asMessage(err)}`;
                return;
            }
            try {
                const result = await this._withTimeout(this.hass.connection.sendMessagePromise({
                    type: "home_insights/list",
                    include_applied: Boolean(this._config.include_applied),
                }), "home_insights/list");
                this._insights = result.insights ?? [];
                this._error = undefined; // success clears any prior error
            }
            catch (err) {
                this._error = `Could not list insights: ${this._asMessage(err)}`;
                return;
            }
            // Drop any stale subscription from a prior wire cycle (e.g.
            // tab-return re-mount where disconnectedCallback fired the old
            // unsub but the new connect needs a fresh subscribe).
            this._unsub?.();
            this._unsub = undefined;
            try {
                this._unsub = await this._withTimeout(this.hass.connection.subscribeMessage((event) => this._handleEvent(event), { type: "home_insights/subscribe" }), "home_insights/subscribe");
            }
            catch (err) {
                console.warn("ha-insights-card subscribe failed", err);
                // Subscribe is non-fatal — we have list data; the user just
                // won't see live updates until next refresh.
            }
        }
        finally {
            this._wiring = false;
        }
    }
    _handleEvent(event) {
        // `purged` events carry no insight payload — server fires one when
        // the user clicks "Purge all" / calls ha_insights.purge_observations.
        // Drop the entire local list so the panel goes empty live, no
        // manual page refresh needed.
        if (event.action === "purged") {
            this._insights = [];
            if (this._dialogId)
                this._closeDialog();
            return;
        }
        if (!event.insight)
            return;
        const next = [...this._insights];
        const idx = next.findIndex((i) => i.id === event.insight.id);
        const wantApplied = Boolean(this._config.include_applied);
        if (event.action === "added") {
            if (idx >= 0)
                next[idx] = event.insight;
            else
                next.unshift(event.insight);
        }
        else if (event.action === "dismissed" ||
            event.action === "snoozed") {
            if (idx >= 0)
                next.splice(idx, 1);
            if (this._dialogId === event.insight.id)
                this._closeDialog();
        }
        else if (event.action === "applied") {
            // If this card includes_applied, keep the row + update with the
            // new applied state; otherwise drop it from the active list.
            if (wantApplied) {
                if (idx >= 0)
                    next[idx] = event.insight;
                else
                    next.unshift(event.insight);
            }
            else if (idx >= 0) {
                next.splice(idx, 1);
                if (this._dialogId === event.insight.id)
                    this._closeDialog();
            }
        }
        else if (event.action === "undone") {
            // Insight is back to active state — keep visible regardless
            if (idx >= 0)
                next[idx] = event.insight;
            else
                next.unshift(event.insight);
        }
        else if (idx >= 0) {
            next[idx] = event.insight;
        }
        this._insights = next;
    }
    /** Optimistic remove — keeps the UX snappy if the subscribe event lags. */
    _removeFromList(id) {
        this._insights = this._insights.filter((i) => i.id !== id);
        if (this._dialogId === id)
            this._closeDialog();
    }
    async _runScanNow() {
        if (!this.hass || this._scanBusy)
            return;
        // home_insights/scan_now WS endpoint awaits actual scan completion
        // and returns counts. call_service was returning the moment the call
        // queued, so the toast said "complete" instantly while the scan was
        // still in flight, with no in-progress feedback.
        this._scanBusy = true;
        this._toast = "Scanning…";
        try {
            const scan = await this.hass.connection.sendMessagePromise({ type: "home_insights/scan_now" });
            const noun = scan.insights_emitted === 1 ? "insight" : "insights";
            this._toast =
                `Scan complete: ${scan.insights_emitted} new ${noun} from ${scan.detectors_run.length} detectors`;
            // Refresh the list so any new insights show up immediately
            try {
                const result = await this.hass.connection.sendMessagePromise({
                    type: "home_insights/list",
                    include_applied: Boolean(this._config.include_applied),
                });
                this._insights = result.insights ?? [];
            }
            catch {
                // Subscribe events will eventually catch up; non-fatal
            }
        }
        catch (err) {
            this._error = `Scan failed: ${this._asMessage(err)}`;
        }
        finally {
            this._scanBusy = false;
        }
    }
    async _undo(insight, force = false) {
        if (!this.hass)
            return;
        this._busyId = insight.id;
        try {
            const result = await this.hass.connection.sendMessagePromise({
                type: "home_insights/undo",
                insight_id: insight.id,
                force,
            });
            this._toast = result.drift_detected && result.force_used
                ? `Undid ${insight.title} (forced — your edits were lost)`
                : `Undid ${insight.title}`;
        }
        catch (err) {
            const message = this._asMessage(err);
            // Drift error is recoverable — offer force-undo confirmation
            const code = err.code;
            if (code === "drift") {
                const proceed = window.confirm(`${message}\n\nForce undo and lose your manual edits?`);
                if (proceed) {
                    await this._undo(insight, true);
                    return;
                }
            }
            else {
                this._failModal(`Undo failed: ${message}`);
            }
        }
        finally {
            this._busyId = undefined;
        }
    }
    async _apply(insight, refinedPayload) {
        if (!this.hass)
            return;
        // If the user opened the inline payload editor, parse their JSON.
        // Parse errors abort the apply with an inline error in the modal —
        // the modal stays open so they can fix and retry.
        let editedPayload;
        const editedSource = this._payloadEditsById.get(insight.id);
        if (editedSource !== undefined
            && this._editingPayloadFor.has(insight.id)) {
            try {
                const parsed = JSON.parse(editedSource);
                if (typeof parsed !== "object"
                    || parsed === null
                    || Array.isArray(parsed)) {
                    throw new Error("Edited payload must be a JSON object");
                }
                editedPayload = parsed;
                const errs = new Map(this._payloadParseErrorById);
                errs.delete(insight.id);
                this._payloadParseErrorById = errs;
            }
            catch (err) {
                const errs = new Map(this._payloadParseErrorById);
                errs.set(insight.id, `Invalid JSON: ${this._asMessage(err)}`);
                this._payloadParseErrorById = errs;
                return;
            }
        }
        this._busyId = insight.id;
        try {
            // Edit precedence: explicit edited payload > refined > original.
            // Rename block layers on top of whichever base the user is using.
            const basePayload = editedPayload ?? refinedPayload ?? insight.payload;
            const edits = this._renameEdits.get(insight.id);
            const renamed = edits && (edits.alias !== undefined || edits.description !== undefined);
            const useOverride = editedPayload || refinedPayload || renamed;
            const override = useOverride
                ? { ...basePayload, ...(edits ?? {}) }
                : undefined;
            const message = {
                type: "home_insights/apply",
                insight_id: insight.id,
            };
            if (override)
                message.payload_override = override;
            await this.hass.connection.sendMessagePromise(message);
            // Cleanup local state
            this._refinedById.delete(insight.id);
            this._renameEdits.delete(insight.id);
            this._resetRefineConversation(insight.id);
            this._removeFromList(insight.id);
            const label = editedPayload
                ? "Applied (edited)"
                : refinedPayload
                    ? "Applied refined"
                    : renamed
                        ? "Applied (renamed)"
                        : "Applied";
            this._toast = `${label}: ${insight.title}`;
            // Cleanup edit state on successful apply
            const editing = new Set(this._editingPayloadFor);
            editing.delete(insight.id);
            this._editingPayloadFor = editing;
            const drafts = new Map(this._payloadEditsById);
            drafts.delete(insight.id);
            this._payloadEditsById = drafts;
        }
        catch (err) {
            this._failModal(`Apply failed: ${this._asMessage(err)}`);
        }
        finally {
            this._busyId = undefined;
        }
    }
    _togglePayloadEdit(insight, basePayload) {
        const editing = new Set(this._editingPayloadFor);
        if (editing.has(insight.id)) {
            editing.delete(insight.id);
            // Discard the in-progress edit
            const drafts = new Map(this._payloadEditsById);
            drafts.delete(insight.id);
            this._payloadEditsById = drafts;
            const errs = new Map(this._payloadParseErrorById);
            errs.delete(insight.id);
            this._payloadParseErrorById = errs;
        }
        else {
            editing.add(insight.id);
            // Seed from the base payload the user is currently looking at:
            // refined when in refined-preview view, else the original.
            const seed = basePayload ?? insight.payload;
            const drafts = new Map(this._payloadEditsById);
            drafts.set(insight.id, JSON.stringify(seed, null, 2));
            this._payloadEditsById = drafts;
        }
        this._editingPayloadFor = editing;
    }
    _onPayloadEditInput(insightId, e) {
        const value = e.target.value;
        const drafts = new Map(this._payloadEditsById);
        drafts.set(insightId, value);
        this._payloadEditsById = drafts;
        // Clear stale parse error so user gets immediate feedback on next Apply
        if (this._payloadParseErrorById.has(insightId)) {
            const errs = new Map(this._payloadParseErrorById);
            errs.delete(insightId);
            this._payloadParseErrorById = errs;
        }
    }
    _onRenameField(insightId, field, e) {
        const value = e.target.value;
        const next = new Map(this._renameEdits);
        const entry = { ...(next.get(insightId) ?? {}) };
        entry[field] = value;
        next.set(insightId, entry);
        this._renameEdits = next;
    }
    _renderRename(insight, refined) {
        const base = refined?.payload ?? insight.payload;
        const edits = this._renameEdits.get(insight.id) ?? {};
        const alias = edits.alias ?? base.alias ?? "";
        const description = edits.description ?? base.description ?? "";
        return b `
      <div class="rename">
        <h4>Customize</h4>
        <label for="ha-insights-alias-${insight.id}">Alias</label>
        <input
          id="ha-insights-alias-${insight.id}"
          type="text"
          .value=${alias}
          @input=${(e) => this._onRenameField(insight.id, "alias", e)}
        />
        <label for="ha-insights-desc-${insight.id}">Description</label>
        <textarea
          id="ha-insights-desc-${insight.id}"
          .value=${description}
          @input=${(e) => this._onRenameField(insight.id, "description", e)}
        ></textarea>
      </div>
    `;
    }
    /** Pick the right error sink. Modal-open errors stay scoped; the rest go
     *  to the main card banner. */
    _failModal(message) {
        if (this._dialogId) {
            this._modalError = message;
        }
        else {
            this._error = message;
        }
    }
    async _dismiss(insight) {
        if (!this.hass)
            return;
        this._busyId = insight.id;
        try {
            await this.hass.connection.sendMessagePromise({
                type: "home_insights/dismiss",
                insight_id: insight.id,
            });
            this._removeFromList(insight.id);
            this._toast = "Dismissed";
        }
        catch (err) {
            this._failModal(`Dismiss failed: ${this._asMessage(err)}`);
        }
        finally {
            this._busyId = undefined;
        }
    }
    async _snooze(insight) {
        if (!this.hass)
            return;
        const until = new Date();
        until.setDate(until.getDate() + 7);
        this._busyId = insight.id;
        try {
            await this.hass.connection.sendMessagePromise({
                type: "home_insights/snooze",
                insight_id: insight.id,
                until: until.toISOString(),
            });
            this._removeFromList(insight.id);
            this._toast = "Snoozed for 7 days";
        }
        catch (err) {
            this._failModal(`Snooze failed: ${this._asMessage(err)}`);
        }
        finally {
            this._busyId = undefined;
        }
    }
    /** Preview the deterministic-fix audit (Phase B.5) as a side-by-
     *  side diff. NO LLM call — the refined YAML is already in the
     *  insight payload from when the detector ran. We just need to
     *  pull the current YAML so the diff has both sides.
     *
     *  Cost: one cheap WS call to home_insights/get_automation,
     *  zero LLM tokens. Lets users see "here's what would change if
     *  I click Apply" without committing. */
    async _previewDeterministicAudit(insight) {
        if (!this.hass)
            return;
        const payload = insight.payload || {};
        const auditMeta = payload._audit || {};
        const automationId = auditMeta.automation_id ||
            payload.id ||
            "";
        const alias = auditMeta.automation_alias ||
            payload.alias ||
            automationId;
        const fixSummaries = Array.isArray(auditMeta.fix_summaries)
            ? auditMeta.fix_summaries
            : [];
        // The refined automation lives at the top level of the payload
        // (Phase B.5 spreads it). Strip the `_audit` metadata so we
        // diff just the YAML the user would actually apply.
        const refinedConfig = {};
        for (const [k, v] of Object.entries(payload)) {
            if (k === "_audit")
                continue;
            refinedConfig[k] = v;
        }
        // Prefer the backend's pre-serialized YAML (now stored on the
        // insight payload as _audit.refined_yaml_text). Falls back to a
        // client-side JSON dump for backwards compatibility with older
        // stored audit insights.
        const backendRefinedYaml = typeof auditMeta.refined_yaml_text === "string"
            ? auditMeta.refined_yaml_text
            : "";
        try {
            const result = await this.hass.connection.sendMessagePromise({
                type: "home_insights/get_automation",
                automation_id: automationId,
            });
            const refinedYaml = backendRefinedYaml || JSON.stringify(refinedConfig, null, 2);
            this._refineAutomationModal = {
                automationId,
                alias,
                originalYaml: result.yaml,
                feedback: "",
                busy: false,
                refinedYaml,
                refinedConfig,
                rationale: "Deterministic fix — no LLM was called. " +
                    (fixSummaries.length > 0
                        ? fixSummaries.join(" ")
                        : "Review the diff below; Apply writes the refined YAML to your automation."),
                diffSummary: fixSummaries,
                refinedSource: "deterministic",
                auditInsightId: insight.id,
            };
        }
        catch (err) {
            this._failModal(`Preview failed: ${this._asMessage(err)}`);
        }
    }
    /** Two-stage refinement: take the current modal's refined YAML
     *  (from a 📋 Preview) as the new starting point, then ask the
     *  LLM to refine further with any additional user feedback typed
     *  in the textarea. The deterministic fixes are preserved as the
     *  baseline — the LLM builds on top instead of redoing them. */
    async _refineFurtherWithLlm() {
        const m = this._refineAutomationModal;
        if (!this.hass || !m || !m.auditInsightId || !m.refinedConfig)
            return;
        this._refineAutomationModal = { ...m, busy: true, error: undefined };
        try {
            const result = await this.hass.connection.sendMessagePromise({
                type: "home_insights/audit_suggest",
                insight_id: m.auditInsightId,
                seed_config: m.refinedConfig,
                extra_feedback: m.feedback || "",
                ...(this._config.audit_depth
                    ? { analysis_depth: this._config.audit_depth }
                    : {}),
            });
            if (!result.refined_yaml) {
                throw new Error("LLM response missing refined_yaml. The integration may "
                    + "need a reload to pick up the two-stage refinement code.");
            }
            this._refineAutomationModal = {
                ...m,
                // Baseline is now the algorithm's output (what the LLM was
                // given). Refined is the LLM's further refinement.
                originalYaml: result.original_yaml ?? m.refinedYaml ?? "",
                refinedYaml: result.refined_yaml,
                refinedConfig: result.refined_config,
                rationale: result.rationale,
                diffSummary: result.diff_summary ?? [],
                bytesSent: result.bytes_sent,
                bytesReceived: result.bytes_received,
                busy: false,
                refinedSource: "stage-two",
            };
        }
        catch (err) {
            this._refineAutomationModal = {
                ...this._refineAutomationModal,
                busy: false,
                error: this._asMessage(err),
            };
        }
    }
    /** Ask the LLM for concrete YAML edits on an audit insight whose
     *  findings don't have a deterministic fix. Reuses the
     *  refine-existing-automation modal to render the result. Cached
     *  on the backend by (yaml_hash + observation_kinds_hash) so a
     *  repeated click on the same row costs zero tokens. */
    async _runAuditSuggest(insight) {
        if (!this.hass)
            return;
        this._auditSuggestBusy = insight.id;
        try {
            const result = await this.hass.connection.sendMessagePromise({
                type: "home_insights/audit_suggest",
                insight_id: insight.id,
                // Per-call override of the integration's audit_analysis_depth
                // OptionsFlow setting. Backend resolves: per-call > options
                // > "concise" default.
                ...(this._config.audit_depth
                    ? { analysis_depth: this._config.audit_depth }
                    : {}),
            });
            // Loud-fail guard: if the backend didn't ship original_yaml /
            // refined_yaml (only refined_config), the integration is
            // running stale Python and the modal would open blank. Throw
            // here so the user sees the persistent notification + banner,
            // not an empty dialog.
            if (!result.original_yaml || !result.refined_yaml) {
                throw new Error("Audit suggest response is missing YAML fields. The integration "
                    + "needs a reload: Settings → Devices & Services → HA Insights → "
                    + "⋮ → Reload. Python caches old code until that's done.");
            }
            // Render via the existing refine-existing-automation modal so
            // we don't ship a second YAML diff UI. Backend now serializes
            // both sides as real YAML so the side-by-side diff is readable.
            this._refineAutomationModal = {
                automationId: result.automation_id,
                alias: result.alias ?? "",
                originalYaml: result.original_yaml,
                feedback: "",
                busy: false,
                refinedYaml: result.refined_yaml,
                refinedConfig: result.refined_config,
                rationale: result.rationale,
                diffSummary: result.diff_summary ?? [],
                bytesSent: result.bytes_sent,
                bytesReceived: result.bytes_received,
            };
        }
        catch (err) {
            const message = this._asMessage(err);
            // Two-channel visibility: card error banner AND an HA persistent
            // notification. A silent button reset is what landed the user
            // here previously — never again. Notification stays until the
            // user dismisses it; banner is per-card-render.
            this._failModal(`Suggest failed: ${message}`);
            void this._postPersistentNotification("HA Insights: 🤖 Suggest failed", `Could not suggest improvements for "${insight.title}": ${message}\n\n`
                + "If this is the AttemptAudit/to_dict error, reload the integration "
                + "(Settings → Devices & Services → HA Insights → ⋮ → Reload) — "
                + "Python caches the old code until reload.", `ha_insights_suggest_fail_${insight.id}`);
        }
        finally {
            this._auditSuggestBusy = null;
        }
    }
    /** Fire HA's persistent_notification.create so a failure isn't
     *  hidden in the card's banner if the user scrolled away.
     *  Notification appears under the bell icon in the top bar AND
     *  in Settings → Notifications. */
    async _postPersistentNotification(title, message, notificationId) {
        if (!this.hass)
            return;
        try {
            await this.hass.connection.sendMessagePromise({
                type: "call_service",
                domain: "persistent_notification",
                service: "create",
                service_data: {
                    title,
                    message,
                    notification_id: notificationId,
                },
            });
        }
        catch {
            // Notification fallback is best-effort; banner already has it.
        }
    }
    async _explain(insight) {
        if (!this.hass)
            return;
        this._explainBusy = true;
        try {
            const result = await this.hass.connection.sendMessagePromise({
                type: "home_insights/explain",
                insight_id: insight.id,
            });
            this._insights = this._insights.map((i) => i.id === insight.id ? { ...i, explanation: result.explanation } : i);
        }
        catch (err) {
            this._failModal(`Explain failed: ${this._asMessage(err)}`);
        }
        finally {
            this._explainBusy = false;
        }
    }
    /** v0.9 phase 6: ask the LLM for plausible causes of an anomaly. */
    async _hypothesize(insight) {
        if (!this.hass)
            return;
        this._hypothesizeBusy = true;
        try {
            const result = await this.hass.connection.sendMessagePromise({
                type: "home_insights/hypothesize",
                insight_id: insight.id,
            });
            const next = new Map(this._hypothesisById);
            next.set(insight.id, result.hypothesis ?? "");
            this._hypothesisById = next;
        }
        catch (err) {
            this._failModal(`Hypothesize failed: ${this._asMessage(err)}`);
        }
        finally {
            this._hypothesizeBusy = false;
        }
    }
    async _refine(insight) {
        if (!this.hass)
            return;
        this._refineBusy = true;
        this._modalError = undefined;
        try {
            // v1.0 RC #1: pre-flight cost estimate. The server runs the same
            // redactor + prompt build as the actual Refine but stops before
            // the LLM call, so we get an accurate token + USD figure for free.
            // If it crosses the configured threshold, ask the user to confirm
            // before burning tokens. Failures fall through silently — we'd
            // rather Refine than block on a flaky pre-flight.
            const feedback = (this._feedbackById.get(insight.id) ?? "").trim();
            try {
                const estimate = await this.hass.connection.sendMessagePromise({
                    type: "home_insights/refine_cost_estimate",
                    insight_id: insight.id,
                    ...(feedback ? { feedback } : {}),
                });
                if (estimate.requires_confirm) {
                    const tokens = estimate.tokens_in + estimate.tokens_out;
                    const dollars = estimate.cost_usd.toFixed(4);
                    const agent = estimate.agent_id ?? "default agent";
                    const ok = window.confirm(`Refine on ${agent} will use ~${tokens} tokens (~$${dollars}). ` +
                        `That's above the configured $${estimate.threshold_usd.toFixed(2)} ` +
                        `threshold. Continue?`);
                    if (!ok) {
                        this._toast = "Refine canceled";
                        return;
                    }
                }
            }
            catch {
                // Pre-flight failed — proceed with the actual refine; the user
                // sees the regular refine error path if it really is broken.
            }
            const message = {
                type: "home_insights/refine",
                insight_id: insight.id,
            };
            if (feedback)
                message.feedback = feedback;
            // Thread the prior conversation_id (if any) so the agent retains
            // context across turns. Server failover automatically drops it
            // when falling over to a different agent.
            const prior = this._refineConversationById.get(insight.id);
            if (prior)
                message.conversation_id = prior;
            const result = await this.hass.connection.sendMessagePromise(message);
            // Capture the new (or echoed) conversation_id for the next turn.
            if (result.conversation_id) {
                const nextConv = new Map(this._refineConversationById);
                nextConv.set(insight.id, result.conversation_id);
                this._refineConversationById = nextConv;
            }
            const nextTurns = new Map(this._refineTurnsById);
            nextTurns.set(insight.id, (nextTurns.get(insight.id) ?? 0) + 1);
            this._refineTurnsById = nextTurns;
            const next = new Map(this._refinedById);
            next.set(insight.id, {
                payload: result.refined_payload,
                rationale: result.rationale,
                diffSummary: result.diff_summary,
            });
            this._refinedById = next;
            // Clear the feedback once the LLM has consumed it; the user can type
            // fresh notes for the next refine pass.
            const nextFb = new Map(this._feedbackById);
            nextFb.delete(insight.id);
            this._feedbackById = nextFb;
            this._toast = result.diff_summary.length > 0
                ? `Refined: ${result.diff_summary.length} change(s) proposed`
                : "Refined: no changes proposed";
        }
        catch (err) {
            const message = this._asMessage(err);
            // If validation rejected the refinement because the LLM added an
            // entity not in the original, auto-populate the feedback box with a
            // constraint hint so the user can click Refine again to retry. The
            // hint references the original payload's entity_ids only.
            const hint = this._buildConstraintHint(insight, message);
            if (hint) {
                const fb = new Map(this._feedbackById);
                fb.set(insight.id, hint);
                this._feedbackById = fb;
                this._failModal(`${message}\n\n→ A constraint hint has been added below. ` +
                    "Click ✨ Refine again to retry with that hint.");
            }
            else {
                this._failModal(`Refine failed: ${message}`);
            }
        }
        finally {
            this._refineBusy = false;
        }
    }
    async _previewRedaction(insight) {
        if (!this.hass)
            return;
        // Toggle off if already shown
        if (this._previewById.has(insight.id)) {
            const next = new Map(this._previewById);
            next.delete(insight.id);
            this._previewById = next;
            return;
        }
        this._previewBusy = true;
        try {
            const result = await this.hass.connection.sendMessagePromise({
                type: "home_insights/redaction_preview",
                insight_id: insight.id,
            });
            const next = new Map(this._previewById);
            next.set(insight.id, result);
            this._previewById = next;
        }
        catch (err) {
            this._failModal(`Preview failed: ${this._asMessage(err)}`);
        }
        finally {
            this._previewBusy = false;
        }
    }
    _renderPreview(insight) {
        const preview = this._previewById.get(insight.id);
        if (!preview)
            return A;
        const pseudonymCount = Object.keys(preview.pseudonym_map).length;
        return b `
      <div class="preview">
        <div class="preview-header">
          <strong>🛡️ What the LLM would see (${preview.privacy_mode} mode)</strong>
          <button
            class="dialog-close"
            aria-label="Close preview"
            @click=${() => this._previewRedaction(insight)}
          >×</button>
        </div>
        <div class="preview-stats">
          <span>${pseudonymCount} entit${pseudonymCount === 1 ? "y" : "ies"} pseudonymized</span>
          <span>${preview.attributes_stripped.length} attribute${preview.attributes_stripped.length === 1 ? "" : "s"} stripped</span>
          ${preview.entities_blocked.length > 0
            ? b `<span style="color: var(--error-color)">${preview.entities_blocked.length} blocked</span>`
            : A}
        </div>
        <pre>${JSON.stringify(preview.redacted_payload, null, 2)}</pre>
        ${pseudonymCount > 0
            ? b `
              <div class="preview-pseudonyms">
                Pseudonym map (kept locally only):
                ${Object.entries(preview.pseudonym_map).map(([real, pseudo]) => b `
                    <div>
                      <code>${real}</code> → <code>${pseudo}</code>
                    </div>
                  `)}
              </div>
            `
            : A}
      </div>
    `;
    }
    /**
     * Detect the "hallucinated entity" validation failure pattern and build
     * a constraint hint that names the legal entity_ids from the original
     * payload. Returns null for any other error so the user just sees the
     * raw refine_failed message.
     */
    _buildConstraintHint(insight, errorMessage) {
        if (!/references entities not in the original/i.test(errorMessage)) {
            return null;
        }
        const allowed = this._collectEntityIds(insight.payload);
        if (allowed.length === 0)
            return null;
        return (`Use ONLY these entity_ids: ${allowed.join(", ")}. `
            + "Do not introduce any new entities. "
            + "Adding new services (e.g. light.turn_off) on the existing "
            + "entities is fine.");
    }
    /**
     * Mirror of the server-side _collect_entity_ids: walk the payload and
     * gather entity_id values from `entity_id` / `entity_ids` fields only.
     */
    _collectEntityIds(value, inEntityField = false) {
        if (value == null)
            return [];
        if (typeof value === "string") {
            if (!inEntityField)
                return [];
            const matches = value.match(/\b[a-z_]+\.[a-z0-9_]+\b/g) ?? [];
            return matches;
        }
        if (Array.isArray(value)) {
            const out = [];
            for (const item of value) {
                out.push(...this._collectEntityIds(item, inEntityField));
            }
            return Array.from(new Set(out));
        }
        if (typeof value === "object") {
            const out = [];
            for (const [key, sub] of Object.entries(value)) {
                const nestedInEntityField = inEntityField || key === "entity_id" || key === "entity_ids";
                out.push(...this._collectEntityIds(sub, nestedInEntityField));
            }
            return Array.from(new Set(out));
        }
        return [];
    }
    _keepOriginal(insightId) {
        const next = new Map(this._refinedById);
        next.delete(insightId);
        this._refinedById = next;
        this._resetRefineConversation(insightId);
        this._toast = "Kept original";
    }
    /** v1.0 RC #2: clear the multi-turn refine context for an insight. */
    _resetRefineConversation(insightId) {
        if (this._refineConversationById.has(insightId)) {
            const next = new Map(this._refineConversationById);
            next.delete(insightId);
            this._refineConversationById = next;
        }
        if (this._refineTurnsById.has(insightId)) {
            const next = new Map(this._refineTurnsById);
            next.delete(insightId);
            this._refineTurnsById = next;
        }
    }
    async _testActions(insight, override) {
        if (!this.hass)
            return;
        const which = override ? "refined" : "original";
        this._testBusy = true;
        this._testResults = undefined;
        try {
            const payload = {
                type: "home_insights/test_actions",
                insight_id: insight.id,
            };
            if (override)
                payload.payload_override = override;
            const result = await this.hass.connection.sendMessagePromise(payload);
            this._testResults = {
                ran: result.ran,
                error_count: result.error_count,
                results: result.results,
                tested: which,
            };
        }
        catch (err) {
            this._failModal(`Test actions failed: ${this._asMessage(err)}`);
        }
        finally {
            this._testBusy = false;
        }
    }
    _clearTestResults() {
        this._testResults = undefined;
    }
    /** Heading for the payload view, based on payload_format.
     * Stops the modal from labelling a "report" or "blueprint" payload
     * as "Automation that would be created" — confusing for SetupQuality
     * tier rows and orphan_device anomalies that aren't applyable. */
    _payloadHeading(format) {
        switch (format) {
            case "automation":
                return "Automation that would be created";
            case "blueprint":
                return "Blueprint that would be created";
            case "card":
                return "Card that would be added";
            case "group":
                return "Group that would be created";
            case "scene":
                return "Scene that would be created";
            case "report":
            default:
                return "Details";
        }
    }
    _renderPayloadView(insight, basePayload) {
        const editing = this._editingPayloadFor.has(insight.id);
        const draft = this._payloadEditsById.get(insight.id);
        const parseError = this._payloadParseErrorById.get(insight.id);
        const rawView = basePayload ?? insight.payload;
        // v1.2.16: strip private detector metadata (underscore-prefixed
        // keys like _manual_habit, _audit) from the YAML preview so the
        // user sees what will actually be written to automations.yaml,
        // not an extra blob of "what does this even mean" detector
        // bookkeeping. The server-side writer (v1.5.34) strips the same
        // keys before write — this is the visual equivalent.
        const view = this._stripPrivateKeys(rawView);
        return b `
      <div class="payload-edit">
        <button
          @click=${() => this._togglePayloadEdit(insight, basePayload)}
          title=${editing
            ? "Discard edits and revert"
            : "Edit the payload as JSON before Apply"}
        >
          ${editing ? "✕ Cancel edit" : "✎ Edit"}
        </button>
      </div>
      ${editing
            ? b `
            <textarea
              class="payload-editor ${parseError ? "error" : ""}"
              spellcheck="false"
              .value=${draft ?? JSON.stringify(view, null, 2)}
              @input=${(e) => this._onPayloadEditInput(insight.id, e)}
            ></textarea>
            ${parseError
                ? b `<div class="payload-error">${parseError}</div>`
                : A}
          `
            : b `<pre>${JSON.stringify(view, null, 2)}</pre>`}
    `;
    }
    /** v1.2.16 — drop top-level keys prefixed with `_` from the YAML
     *  preview. Detectors stash internal metadata under `_manual_habit`,
     *  `_audit`, `_streak`, etc. — useful for cohort dedup + fingerprinting
     *  but invisible to the user when they open automations.yaml.
     *  Returns a shallow copy; caller's object is untouched.
     *
     *  v1.2.20: keep `_*_assessment` keys visible. Those carry the
     *  v1.5.35+ grader output (timing / cooccurrence / persistence) and
     *  are the transparency layer users need to understand WHY their
     *  confidence is what it is. The server-side automation_writer
     *  (v1.5.34) strips them before write, so they never reach
     *  automations.yaml regardless of what's in the preview.
     */
    _stripPrivateKeys(payload) {
        if (!payload || typeof payload !== "object")
            return {};
        const out = {};
        for (const [k, v] of Object.entries(payload)) {
            if (!k.startsWith("_") || k.endsWith("_assessment")) {
                out[k] = v;
            }
        }
        return out;
    }
    _renderModalError() {
        if (!this._modalError)
            return A;
        return b `
      <div class="error-banner" style="margin-bottom: 12px; border-radius: 6px;">
        <span>${this._modalError}</span>
        <button @click=${() => (this._modalError = undefined)}>Dismiss</button>
      </div>
    `;
    }
    _renderTestResults() {
        const tr = this._testResults;
        if (!tr)
            return A;
        const allOk = tr.error_count === 0 && tr.ran > 0;
        const allFail = tr.ran === 0 && tr.error_count > 0;
        const cls = allOk ? "test-results ok" : allFail ? "test-results fail" : "test-results";
        const summary = `Tested ${tr.tested} — ${tr.ran} ran, ${tr.error_count} error${tr.error_count === 1 ? "" : "s"}`;
        return b `
      <div class=${cls}>
        <div class="test-results-header">
          <span>${summary}</span>
          <button
            class="test-results-close"
            aria-label="Close test results"
            @click=${this._clearTestResults}
          >×</button>
        </div>
        <ul>
          ${tr.results.map((r) => {
            const icon = r.ok ? "✓" : r.skipped ? "—" : "✗";
            const iconCls = r.ok ? "icon-ok" : r.skipped ? "icon-skip" : "icon-fail";
            return b `
              <li>
                <span class="icon ${iconCls}">${icon}</span>
                <div>
                  <div>
                    ${r.service ?? "(action)"}${r.skipped ? " (skipped)" : ""}
                  </div>
                  ${r.error
                ? b `<div class="test-results-error">${r.error}</div>`
                : A}
                </div>
              </li>
            `;
        })}
        </ul>
      </div>
    `;
    }
    /** Auto-pick a tts.* entity if the user didn't configure one. */
    _resolveTtsEngine() {
        if (this._config.tts_engine_entity_id)
            return this._config.tts_engine_entity_id;
        const states = this.hass?.states ?? {};
        return Object.keys(states).find((eid) => eid.startsWith("tts."));
    }
    async _readAloud(insight) {
        if (!this.hass || !insight.explanation)
            return;
        const target = this._config.tts_target_entity_id;
        if (!target)
            return;
        const engine = this._resolveTtsEngine();
        if (!engine) {
            this._failModal("No TTS engine found. Install one (Piper / Google Cloud / Nabu Casa) or set " +
                "tts_engine_entity_id in the card config.");
            return;
        }
        this._ttsBusy = true;
        try {
            await this.hass.connection.sendMessagePromise({
                type: "call_service",
                domain: "tts",
                service: "speak",
                service_data: {
                    entity_id: engine,
                    media_player_entity_id: target,
                    message: insight.explanation,
                },
            });
            this._toast = `Speaking on ${target}`;
        }
        catch (err) {
            this._failModal(`TTS failed: ${this._asMessage(err)}`);
        }
        finally {
            this._ttsBusy = false;
        }
    }
    _asMessage(err) {
        if (err && typeof err === "object" && "message" in err) {
            return String(err.message);
        }
        return String(err);
    }
    _filtered() {
        const min = this._config.min_confidence ?? 0;
        const userMax = this._config.max_rows;
        const cap = userMax !== undefined
            ? userMax
            : this._autoMaxRows > 0
                ? this._autoMaxRows
                : DEFAULT_MAX_ROWS;
        const search = (this._config.search ?? "").trim().toLowerCase();
        const sortBy = this._config.sort_by ?? "confidence";
        // v1.1 panel-only chip filters. Empty array OR undefined = no filter
        // for that dimension. Empty value (`null` device_class, `null` area)
        // passes only if the corresponding filter list is empty.
        const domainSet = new Set(this._config.domain_filter ?? []);
        const areaSet = new Set(this._config.area_filter ?? []);
        const dcSet = new Set(this._config.device_class_filter ?? []);
        const detSet = new Set(this._config.detector_filter ?? []);
        const floorSet = new Set(this._config.floor_filter ?? []);
        const integSet = new Set(this._config.integration_filter ?? []);
        const labelSet = new Set(this._config.label_filter ?? []);
        const hideAlreadyAutomated = this._config.hide_already_automated === true;
        const filtered = this._insights
            .filter((i) => i.confidence >= min)
            .filter((i) => !search || i.title.toLowerCase().includes(search))
            .filter((i) => domainSet.size === 0 || (i.domain != null && domainSet.has(i.domain)))
            .filter((i) => areaSet.size === 0 || (i.area_id != null && areaSet.has(i.area_id)))
            .filter((i) => dcSet.size === 0 ||
            (i.device_class != null && dcSet.has(i.device_class)))
            .filter((i) => detSet.size === 0 || detSet.has(i.detector))
            .filter((i) => floorSet.size === 0 || (i.floor_id != null && floorSet.has(i.floor_id)))
            .filter((i) => integSet.size === 0 ||
            (i.integration != null && integSet.has(i.integration)))
            .filter((i) => labelSet.size === 0 ||
            (Array.isArray(i.labels) && i.labels.some((l) => labelSet.has(l))))
            .filter((i) => !hideAlreadyAutomated || i.conflicts_with.length === 0);
        filtered.sort((a, b) => {
            if (sortBy === "age") {
                // Newest first
                return (new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            }
            if (sortBy === "detector") {
                const cmp = a.detector.localeCompare(b.detector);
                return cmp !== 0 ? cmp : b.confidence - a.confidence;
            }
            // Default: confidence (high first)
            return b.confidence - a.confidence;
        });
        // Client-side dedup pass. Works on whatever the server sent —
        // useful when the server hasn't been reloaded since the dedup
        // helper shipped, or when the store has insights from an older
        // fingerprint schema. Pure presentation transform; no WS calls.
        const deduped = this._clientSideDedup(filtered);
        // Stash the full match count so the compact tile and "Showing X
        // of Y" footer can report the TRUE count instead of the
        // post-cap subset. Was previously hard-pinned to whatever
        // max_rows said, which made the dashboard's compact tile show
        // "1 insight" even when the user had 15 to look at.
        this._totalFilteredCount = deduped.length;
        return deduped.slice(0, cap);
    }
    /** Group insights by (detector, normalized title). Rows that share a
     *  normalized title AND a common domain get merged: highest-confidence
     *  one becomes the representative, others collapse into cohort_members.
     *  Idempotent — if the server already merged them (cohort_label set on
     *  every row of the bucket), pass through unchanged. */
    _clientSideDedup(rows) {
        if (rows.length < 2)
            return rows;
        const buckets = new Map();
        for (const r of rows) {
            // Strip entity_id-shaped tokens from the title to find similar rows.
            const norm = (r.title || "").replace(/\b[a-z_]+\.[A-Za-z0-9_]+\b/g, "<E>");
            // Include the row's domain in the bucket key so mixed-domain
            // titles never lump together. Without this split, an NVR with 35
            // binary_sensor offline rows + 11 switch offline rows all
            // bucketed into one mixed-domain bucket and then bailed out at
            // the "Mixed domains — keep separate" branch below, leaving the
            // user with 46 individual rows instead of 2 cohort representatives.
            const domain = r.domain ?? "";
            const key = `${r.detector}|${r.kind}|${norm}|${domain}`;
            const arr = buckets.get(key);
            if (arr)
                arr.push(r);
            else
                buckets.set(key, [r]);
        }
        const out = [];
        for (const bucket of buckets.values()) {
            if (bucket.length < 2) {
                out.push(bucket[0]);
                continue;
            }
            // Collect all entity_ids referenced by the bucket.
            const allEids = new Set();
            for (const ins of bucket) {
                const fp = ins.fingerprint;
                if (fp) {
                    for (const k of [
                        "entity_id",
                        "leader_entity_id",
                        "follower_entity_id",
                        "target_entity_id",
                    ]) {
                        const v = fp[k];
                        if (typeof v === "string" && v.includes("."))
                            allEids.add(v);
                    }
                }
                // Also pick up cohort_members from server-side merges so a
                // partially-merged bucket folds together cleanly.
                for (const m of ins.cohort_members ?? []) {
                    if (typeof m === "string" && m.includes("."))
                        allEids.add(m);
                }
            }
            const eidList = Array.from(allEids).sort();
            if (eidList.length < 2) {
                out.push(...bucket);
                continue;
            }
            const domains = new Set(eidList.map((e) => e.split(".", 1)[0]).filter(Boolean));
            let label;
            if (domains.size === 1) {
                const prefix = this._longestCommonPrefix(eidList);
                label = prefix ?? `${[...domains][0]}.* (cohort)`;
            }
            else {
                // Mixed domains — unusual but possible. Keep separate.
                out.push(...bucket);
                continue;
            }
            const rep = bucket.reduce((best, x) => (x.confidence ?? 0) > (best.confidence ?? 0) ? x : best);
            const others = bucket.length - 1;
            // Idempotent: if the server already added the suffix, don't double.
            const baseTitle = (rep.title || "").replace(/ \(\+\d+ similar entities[^)]*\)$/, "");
            const merged = {
                ...rep,
                title: `${baseTitle} (+${others} similar entities: ${label})`,
                cohort_members: eidList,
                cohort_label: label,
            };
            out.push(merged);
        }
        // Preserve sort order: re-sort by the original sortBy criterion.
        out.sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0));
        return out;
    }
    _longestCommonPrefix(eids) {
        if (eids.length < 2)
            return null;
        const domain = eids[0].split(".", 1)[0];
        const names = eids.map((e) => e.split(".", 2)[1] ?? "");
        let prefix = names[0];
        for (const n of names.slice(1)) {
            while (prefix && !n.startsWith(prefix))
                prefix = prefix.slice(0, -1);
            if (!prefix)
                return null;
        }
        prefix = prefix.replace(/_+$/, "");
        if (prefix.length < 4)
            return null;
        return `${domain}.${prefix}_*`;
    }
    /** Bucket insights by the configured group_by key. Returns ordered
     *  pairs so the render can produce stable section ordering. */
    _grouped(rows) {
        const key = this._config.group_by ?? "none";
        if (key === "none")
            return [["", rows]];
        const buckets = new Map();
        for (const row of rows) {
            // Prefer the friendly name when one is available — the area_id /
            // floor_id are opaque GUIDs in the registry, useless as section
            // headers. integration is already a label-ish string ("hue",
            // "tuya", "mqtt"). Fall back to "(no area)" / "(no floor)" /
            // "(no integration)" so a single bucket collects un-tagged rows
            // and the user can spot what slipped through the registry.
            const groupKey = key === "area"
                ? row.area_name ?? row.area_id ?? "(no area)"
                : key === "floor"
                    ? row.floor_name ?? row.floor_id ?? "(no floor)"
                    : key === "integration"
                        ? row.integration ?? "(no integration)"
                        : key === "label"
                            ? (Array.isArray(row.labels) && row.labels.length > 0
                                ? row.labels[0]
                                : "(no label)")
                            : key === "detector"
                                ? row.detector
                                : "";
            const existing = buckets.get(groupKey);
            if (existing)
                existing.push(row);
            else
                buckets.set(groupKey, [row]);
        }
        return Array.from(buckets.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }
    _openDialog(insightId) {
        this._dialogId = insightId;
        this._testResults = undefined;
        this._modalError = undefined;
    }
    _closeDialog() {
        if (this._dialogId) {
            // Discard rename + payload edits when the modal closes without applying.
            const id = this._dialogId;
            const renames = new Map(this._renameEdits);
            renames.delete(id);
            this._renameEdits = renames;
            const drafts = new Map(this._payloadEditsById);
            drafts.delete(id);
            this._payloadEditsById = drafts;
            const editing = new Set(this._editingPayloadFor);
            editing.delete(id);
            this._editingPayloadFor = editing;
            const errs = new Map(this._payloadParseErrorById);
            errs.delete(id);
            this._payloadParseErrorById = errs;
        }
        this._dialogId = undefined;
        this._testResults = undefined;
        this._modalError = undefined;
    }
    _renderModeBadge(mode) {
        if (!mode)
            return A;
        const cls = `badge badge-${mode}`;
        const label = mode === "off"
            ? "🚫 Off"
            : mode === "local"
                ? "🟢 Local"
                : "🟡 Cloud";
        return b `<span class=${cls} title="Privacy mode: ${mode}">${label}</span>`;
    }
    _renderHeader() {
        const title = this._config.title ?? "HA Insights";
        const sub = this._hello
            ? `v${this._hello.integration_version} · protocol ${this._hello.ws_protocol_version}`
            : "connecting…";
        return b `
      <div class="header">
        <div class="titles">
          <div class="title">
            ${title} ${this._renderModeBadge(this._hello?.privacy_mode)}
          </div>
          <div class="subtitle">${sub}</div>
        </div>
        <a
          class="view-all"
          href="/ha-insights"
          title="Open the full HA Insights panel"
        >View all →</a>
      </div>
    `;
    }
    _renderCompactTile(_rows) {
        // Report the FULL filter-matching count, not the cap-clipped one.
        // _filtered() stashes this for us before slicing.
        const count = this._totalFilteredCount;
        const label = count === 0
            ? "No insights yet — patterns will appear as your home settles in"
            : count === 1
                ? "1 insight ready to review"
                : `${count} insights ready to review`;
        return b `
      <a class="compact-tile" href="/ha-insights">
        <div>
          <div class="count">${count} ${count === 1 ? "insight" : "insights"}</div>
          <div class="label">${label}</div>
        </div>
        <div class="arrow">→</div>
      </a>
    `;
    }
    _renderSkewBanner() {
        if (!this._hello)
            return A;
        if (this._hello.ws_protocol_version === CARD_PROTOCOL_VERSION)
            return A;
        return b `
      <div class="skew-banner">
        Protocol mismatch — card expects v${CARD_PROTOCOL_VERSION}, integration is
        v${this._hello.ws_protocol_version}. Update one or the other.
      </div>
    `;
    }
    /** v1.5.13 — Render cohort dropdown rows with per-member 🔌 integration
     *  and 🏷️ external-app badges. Falls back to plain entity_id chips
     *  when the WS payload predates the cohort_member_info field. */
    _renderCohortMembers(insight, members) {
        const info = insight.cohort_member_info;
        if (!Array.isArray(info) || info.length === 0) {
            // Legacy / pre-v1.5.13 path — just the entity_id chip.
            return members.map((m) => b `<span class="cohort-member-chip">${m}</span>`);
        }
        // Build a lookup so we render members in the order of `cohort_members`
        // (canonical sort) but enriched with the metadata.
        const byId = new Map();
        for (const m of info) {
            byId.set(m.entity_id, {
                integration: m.integration,
                external_source: m.external_source,
            });
        }
        return members.map((eid) => {
            const meta = byId.get(eid);
            return b `<span class="cohort-member-chip">
        <span class="cohort-member-id">${eid}</span>
        ${meta?.integration
                ? b `<span
              class="cohort-member-badge cohort-member-int"
              title="Source integration"
            >🔌 ${meta.integration}</span>`
                : A}
        ${meta?.external_source
                ? b `<span
              class="cohort-member-badge cohort-member-ext"
              title="Schedule likely lives in ${meta.external_source}, not HA"
            >🏷️ ${meta.external_source}</span>`
                : A}
      </span>`;
        });
    }
    _renderRow(insight) {
        const confidencePct = Math.round(insight.confidence * 100);
        const confidenceClass = this._confidenceClass(insight.confidence);
        const ageLabel = this._formatAge(insight.created_at);
        const expanded = this._expandedCohorts.has(insight.id);
        const members = insight.cohort_members ?? [];
        const hasCohort = members.length > 0;
        // Audit-specific finding list: pulled from payload.observations
        // (set by the AutomationAuditDetector). Rendered as a collapsible
        // findings panel beneath the title row so the user sees the
        // observations at a glance.
        const auditObservations = this._auditObservationsFor(insight);
        const auditFixSummaries = this._auditFixSummariesFor(insight);
        const auditExpanded = this._expandedCohorts.has(`audit:${insight.id}`);
        return b `
      <div class="row" @click=${() => this._openDialog(insight.id)}>
        <div class="row-title">
          ${this._displayTitle(insight)}
          ${hasCohort
            ? b ` <button
                class="pill-action"
                style="margin-left:6px;"
                aria-label="${expanded ? "Hide" : "Show"} ${members.length} cohort members"
                aria-expanded="${expanded}"
                title="${expanded ? "Hide" : "Show"} the ${members.length} cohort members"
                @click=${(e) => {
                e.stopPropagation();
                this._toggleCohortExpansion(insight.id);
            }}
              >${expanded ? "▾ hide" : `▸ show ${members.length}`}</button>`
            : A}
          ${auditObservations.length > 0
            ? b ` <button
                class="pill-action"
                style="margin-left:6px;"
                aria-label="${auditExpanded ? 'Hide' : 'Show'} ${auditObservations.length} audit finding${auditObservations.length === 1 ? '' : 's'}"
                aria-expanded="${auditExpanded}"
                title="${auditExpanded ? 'Hide' : 'Show'} the ${auditObservations.length} audit finding${auditObservations.length === 1 ? '' : 's'}"
                @click=${(e) => {
                e.stopPropagation();
                this._toggleCohortExpansion(`audit:${insight.id}`);
            }}
              >${auditExpanded
                ? '▾ hide findings'
                : `▸ ${auditObservations.length} finding${auditObservations.length === 1 ? '' : 's'}`}</button>`
            : A}
        </div>
        ${auditObservations.length > 0 && auditExpanded
            ? b `<div
              class="audit-findings"
              @click=${(e) => e.stopPropagation()}
            >
              <ul>
                ${auditObservations.map((o) => b `<li title="${o.kind}">${o.text}</li>`)}
              </ul>
              ${auditFixSummaries.length > 0
                ? b `<div class="audit-fixes">
                    <strong>🔧 Auto-fix preview:</strong>
                    <ul>
                      ${auditFixSummaries.map((s) => b `<li>${s}</li>`)}
                    </ul>
                  </div>`
                : A}
            </div>`
            : A}
        ${hasCohort && expanded
            ? b `<div
              class="cohort-members"
              @click=${(e) => e.stopPropagation()}
            >${this._renderCohortMembers(insight, members)}</div>`
            : A}
        <div class="row-meta">
          <span class="pill ${confidenceClass}">confidence ${confidencePct}%</span>
          <span class="pill">${insight.detector}</span>
          ${insight.area_id
            ? b `<span class="pill">${insight.area_name ?? insight.area_id}</span>`
            : A}
          ${insight.integration
            ? b `<span
                class="pill"
                style="color: var(--secondary-text-color); background: rgba(76, 110, 245, 0.10);"
                title="Source integration for this entity. Useful context when deciding whether the schedule lives in HA (here) or in the vendor app (look for 🏷️ pill)."
              >🔌 ${insight.integration}</span>`
            : A}
          ${this._renderTrustPill()}
          ${this._renderMaturityPill(insight)}
          ${ageLabel
            ? b `<span class="pill" title=${insight.created_at}>${ageLabel}</span>`
            : A}
          ${insight.applied_at
            ? b `<span
                class="pill"
                style="background: rgba(76, 175, 80, 0.18); color: var(--success-color, #2e7d32);"
                title="Applied at ${insight.applied_at}"
              >✓ applied</span>`
            : A}
          ${insight.conflicts_with.length > 0
            ? this._renderAutomationPill("🔁 already automated", "var(--warning-color)", "HA noticed this pattern, but you already have an automation that covers it", insight.conflicts_with_links ?? insight.conflicts_with.map((a) => ({ alias: a })))
            : A}
          ${insight.referenced_in_automations &&
            insight.referenced_in_automations.length > 0 &&
            insight.conflicts_with.length === 0
            ? this._renderAutomationPill(`🤖 in ${insight.referenced_in_automations.length} ${insight.referenced_in_automations.length === 1 ? "automation" : "automations"}`, "var(--secondary-text-color)", "The entities in this insight are referenced in your existing automation(s)", insight.referenced_in_automations_links ?? insight.referenced_in_automations.map((a) => ({ alias: a })))
            : A}
          ${insight.external_source
            ? b `<span
                class="pill"
                style="color: var(--secondary-text-color); background: rgba(33, 150, 243, 0.10);"
                title="HA noticed this pattern but the schedule is managed in the vendor app (${insight.external_source}) — not in HA. Creating a new HA automation likely won't help."
              >🏷️ managed externally (${insight.external_source})</span>`
            : A}
          ${this._renderTimingPill(insight)}
          ${insight.explanation
            ? b `<span class="pill" title="LLM explanation available">💬 explained</span>`
            : A}
          ${insight.detector === "automation_audit" && insight.payload_format === "report"
            ? b `<button
                class="pill-action"
                ?disabled=${this._auditSuggestBusy === insight.id}
                title="Ask the LLM for concrete YAML edits based on the audit findings"
                @click=${(e) => {
                e.stopPropagation();
                void this._runAuditSuggest(insight);
            }}
              >${this._auditSuggestBusy === insight.id ? "Thinking…" : "🤖 Suggest"}</button>`
            : A}
          ${insight.detector === "automation_audit" && insight.payload_format === "automation"
            ? b `<button
                class="pill-action"
                title="Preview the deterministic fix as a side-by-side diff (no LLM cost)"
                @click=${(e) => {
                e.stopPropagation();
                void this._previewDeterministicAudit(insight);
            }}
              >📋 Preview</button>`
            : A}
        </div>
      </div>
    `;
    }
    /** Pull the observations array off an audit insight's payload.
     *  Returns [] for non-audit insights. Tolerates payloads where
     *  `observations` is missing or malformed. */
    _auditObservationsFor(insight) {
        if (insight.detector !== "automation_audit")
            return [];
        const payload = insight.payload;
        if (!payload)
            return [];
        // Deterministic-fix audits stash observations under _audit.observations.
        const auditMeta = payload._audit;
        const raw = auditMeta?.observations ?? payload.observations;
        if (!Array.isArray(raw))
            return [];
        return raw
            .filter((o) => typeof o === "object" && o !== null)
            .map((o) => ({
            kind: typeof o.kind === "string" ? o.kind : "",
            text: typeof o.text === "string" ? o.text : "",
        }))
            .filter((o) => o.text.length > 0);
    }
    /** For deterministic-fix audit insights (payload_format = automation
     *  with _audit metadata), surface the human-readable summaries of
     *  what was changed. Empty list for the LLM-suggest path or reports. */
    _auditFixSummariesFor(insight) {
        if (insight.detector !== "automation_audit")
            return [];
        const payload = insight.payload;
        if (!payload)
            return [];
        const auditMeta = payload._audit;
        const raw = auditMeta?.fix_summaries;
        if (!Array.isArray(raw))
            return [];
        return raw.filter((s) => typeof s === "string");
    }
    _confidenceClass(confidence) {
        if (confidence >= 0.8)
            return "confidence-high";
        if (confidence >= 0.5)
            return "confidence-medium";
        return "confidence-low";
    }
    /** v1.2.17 — Surface the lib/timing_likelihood assessment as a small
     *  row pill so users see WHY a confidence is what it is.
     *
     *  Three tiers:
     *    DEVICE_LIKELY  → 🤖 device-managed pill, warning color. The
     *      timing is statistically too tight to be a human action (BLE
     *      toothbrush firing OFF exactly 2 min after ON, solar inverter
     *      at sunrise via cloud polling, etc). Confidence already cut
     *      by 80% server-side; the pill explains the demotion.
     *    TIGHT_PATTERN → 🤖 tight-pattern pill, info color. Plausibly
     *      human (alarm-driven routine) but tight enough that a device
     *      timer is also possible. Confidence cut by 15%; pill prompts
     *      the user to think about it.
     *    HUMAN_LIKELY / INSUFFICIENT_DATA → nothing rendered.
     *
     *  Backend ships `_timing_assessment` in the payload (underscore-
     *  prefixed → stripped before automations.yaml write). The card
     *  reads it for rendering only.
     */
    _renderTimingPill(insight) {
        const payload = insight.payload;
        if (!payload)
            return A;
        // v1.2.19: read all three grader assessments (the v1.5.38
        // composite payload-keys output). Any one signal alone produces a
        // pill; multiple signals stack into a multi-line tooltip.
        const t = payload._timing_assessment;
        const c = payload._cooccurrence_assessment;
        const p = payload._persistence_assessment;
        // v1.5.40: 4th grader — transition_entropy (context diversity).
        // Optional; present only when detector passed distinct_entity_counts.
        const e = payload._transition_entropy_assessment;
        const timingClass = typeof t?.timing_class === "string" ? t.timing_class : "";
        const cooccClass = typeof c?.cooccurrence_class === "string"
            ? c.cooccurrence_class
            : "";
        const persClass = typeof p?.persistence_class === "string"
            ? p.persistence_class
            : "";
        const entropyClass = typeof e?.transition_entropy_class === "string"
            ? e.transition_entropy_class
            : "";
        const isDeviceTiming = timingClass === "device_likely";
        const isTightTiming = timingClass === "tight_pattern";
        const isIsolatedCoocc = cooccClass === "isolated";
        const isAmbiguousCoocc = cooccClass === "ambiguous";
        const isFixedPersistence = persClass === "fixed_cycle";
        const isTightPersistence = persClass === "tight_duration";
        const isNovelEntropy = entropyClass === "novel_context";
        if (!isDeviceTiming
            && !isTightTiming
            && !isIsolatedCoocc
            && !isAmbiguousCoocc
            && !isFixedPersistence
            && !isTightPersistence
            && !isNovelEntropy) {
            return A;
        }
        // Multi-line tooltip — each signal contributes one paragraph so
        // the user sees the full evidence chain. Lit's title attribute
        // renders \n\n as a real line break in most browsers.
        const reasons = [];
        if (t?.reason && (isDeviceTiming || isTightTiming))
            reasons.push(t.reason);
        if (c?.reason && (isIsolatedCoocc || isAmbiguousCoocc))
            reasons.push(c.reason);
        if (p?.reason && (isFixedPersistence || isTightPersistence))
            reasons.push(p.reason);
        if (e?.reason && isNovelEntropy)
            reasons.push(e.reason);
        const reason = reasons.join("\n\n") || "Likelihood analysis details unavailable";
        // Severity escalation: any one strong device signal → "device-
        // managed" (warning color). Multiple soft signals stacking also
        // escalate. Otherwise tight-pattern (info color).
        const strongSignals = (isDeviceTiming ? 1 : 0)
            + (isIsolatedCoocc ? 1 : 0)
            + (isFixedPersistence ? 1 : 0);
        const softSignals = (isTightTiming ? 1 : 0)
            + (isAmbiguousCoocc ? 1 : 0)
            + (isTightPersistence ? 1 : 0)
            + (isNovelEntropy ? 1 : 0);
        const isDeviceManaged = strongSignals >= 1 || (strongSignals + softSignals) >= 3;
        if (isDeviceManaged) {
            return b `<span
        class="pill"
        style="color: var(--warning-color, #ef6c00); background: rgba(239, 108, 0, 0.08);"
        title=${reason}
      >🤖 device-managed</span>`;
        }
        return b `<span
      class="pill"
      style="color: var(--info-color, #2196f3); background: rgba(33, 150, 243, 0.08);"
      title=${reason}
    >🤖 tight-pattern</span>`;
    }
    /** Rewrite the title for already-shadowed insights so it doesn't read
     *  as a CTA. The detector emits "Pattern X. Automate this?" but when
     *  conflict_scanner has already matched an existing automation, that
     *  question is misleading — the answer is "no, you already did".
     *
     *  Server-side titles drive cohort-dedup grouping and notification
     *  payloads, so this transform is presentation-only. The 🔁 pill +
     *  conflicts_with_links still tell the full story.
     *
     *  Patterns stripped (case-insensitive trailing CTA):
     *    - "Automate this?" / "Automate it?" / "Automate it" / "Automate."
     *    - "Build automation?"
     *    - "Auto-off after N min?"  ← long_tail also reads as a CTA
     */
    _displayTitle(insight) {
        if (insight.conflicts_with.length === 0)
            return insight.title;
        return insight.title.replace(/\s*(?:Automate\s+(?:this|it)\??|Build\s+automation\??)\s*$/i, "").trim();
    }
    /** Render an "🔁 already automated" or "🤖 in N automations" pill.
     *
     *  Single match (N=1): plain anchor + inline ✏️. Click = open the
     *  one matching automation. Fast path; no extra clicks.
     *
     *  Multiple matches (N>1): `<details>` expander where the summary IS
     *  the pill, and each automation appears below as its own clickable
     *  row with its own ✏️ Refine button. Native `<details>` gives us
     *  expand/collapse for free — no popover state, no click-outside
     *  handling. Earlier version silently picked the first link and the
     *  user couldn't reach the others; this fixes that.
     *
     *  No-id legacy YAML: same fallback as before — text only, no URL,
     *  Refine button hidden. */
    _renderAutomationPill(label, color, leadText, links) {
        const aliases = links.map((l) => l.alias);
        const tooltip = `${leadText}: ${aliases.join(", ")}`;
        // Single-link fast path. Keeps the row compact — most insights only
        // hit one automation, and forcing an extra click feels punitive.
        if (links.length <= 1) {
            const only = links[0];
            const url = only?.url ?? "/config/automation/dashboard";
            return b `<span class="automation-pill-group">
        <a
          class="pill"
          href=${url}
          target="_top"
          style="color: ${color}; text-decoration: none; cursor: pointer;"
          title="${tooltip} — click to open the automation editor"
          @click=${(e) => e.stopPropagation()}
        >${label}</a>
        ${only?.id
                ? b `<button
              class="pill-action"
              aria-label="Refine automation '${only.alias}' with AI"
              title="Refine this automation with AI"
              @click=${(e) => {
                    e.stopPropagation();
                    this._openRefineAutomationModal(only.id, only.alias);
                }}
            >✏️</button>`
                : A}
      </span>`;
        }
        // Multi-link expander. Native <details> handles the open/close state.
        return b `<details
      class="automation-pill-details"
      @click=${(e) => e.stopPropagation()}
    >
      <summary
        class="pill"
        style="color: ${color}; cursor: pointer; list-style: none;"
        title="${tooltip} — click to expand"
      >${label} ▾</summary>
      <div class="automation-pill-menu">
        ${links.map((link) => {
            const url = link.url ?? "/config/automation/dashboard";
            return b `<div class="automation-pill-row">
            <a
              class="automation-pill-link"
              href=${url}
              target="_top"
              title="Open '${link.alias}' in the automation editor"
              @click=${(e) => e.stopPropagation()}
            >${link.alias}</a>
            ${link.id
                ? b `<button
                  class="pill-action"
                  aria-label="Refine automation '${link.alias}' with AI"
                  title="Refine '${link.alias}' with AI"
                  @click=${(e) => {
                    e.stopPropagation();
                    this._openRefineAutomationModal(link.id, link.alias);
                }}
                >✏️</button>`
                : A}
          </div>`;
        })}
      </div>
    </details>`;
    }
    /** Open the refine-existing-automation modal. Loads the YAML via
     *  home_insights/get_automation, then shows the editor + feedback
     *  panel. Errors display inline in the modal. */
    async _openRefineAutomationModal(automationId, alias) {
        if (!this.hass)
            return;
        this._refineAutomationModal = {
            automationId,
            alias,
            feedback: "",
            busy: true,
        };
        try {
            const result = await this.hass.connection.sendMessagePromise({
                type: "home_insights/get_automation",
                automation_id: automationId,
            });
            this._refineAutomationModal = {
                ...this._refineAutomationModal,
                originalYaml: result.yaml,
                busy: false,
            };
        }
        catch (err) {
            this._refineAutomationModal = {
                ...this._refineAutomationModal,
                busy: false,
                error: `Could not load automation: ${this._asMessage(err)}`,
            };
        }
    }
    _toggleCohortExpansion(insightId) {
        const next = new Set(this._expandedCohorts);
        if (next.has(insightId)) {
            next.delete(insightId);
        }
        else {
            next.add(insightId);
        }
        this._expandedCohorts = next;
    }
    _closeRefineAutomationModal() {
        this._refineAutomationModal = undefined;
    }
    async _submitRefineAutomation() {
        if (!this.hass || !this._refineAutomationModal)
            return;
        const m = this._refineAutomationModal;
        if (!m.feedback.trim()) {
            this._refineAutomationModal = {
                ...m,
                error: "Add some feedback for the LLM (what should change?)",
            };
            return;
        }
        this._refineAutomationModal = { ...m, busy: true, error: undefined };
        try {
            const result = await this.hass.connection.sendMessagePromise({
                type: "home_insights/refine_automation",
                automation_id: m.automationId,
                feedback: m.feedback,
            });
            this._refineAutomationModal = {
                ...this._refineAutomationModal,
                busy: false,
                originalYaml: result.original_yaml,
                refinedYaml: result.refined_yaml,
                refinedConfig: result.refined_config,
                rationale: result.rationale,
                diffSummary: result.diff_summary,
                bytesSent: result.bytes_sent,
                bytesReceived: result.bytes_received,
            };
        }
        catch (err) {
            this._refineAutomationModal = {
                ...this._refineAutomationModal,
                busy: false,
                error: `Refine failed: ${this._asMessage(err)}`,
            };
        }
    }
    async _applyRefineAutomation() {
        if (!this.hass || !this._refineAutomationModal)
            return;
        const m = this._refineAutomationModal;
        if (!m.refinedConfig)
            return;
        this._refineAutomationModal = { ...m, busy: true, error: undefined };
        try {
            await this.hass.connection.sendMessagePromise({
                type: "home_insights/apply_automation_refinement",
                automation_id: m.automationId,
                refined_config: m.refinedConfig,
            });
            this._toast = `Applied refinement to '${m.alias}'`;
            this._refineAutomationModal = undefined;
        }
        catch (err) {
            this._refineAutomationModal = {
                ...this._refineAutomationModal,
                busy: false,
                error: `Apply failed: ${this._asMessage(err)}`,
            };
        }
    }
    /** IDE-style line diff. Computes a longest-common-subsequence over
     *  both YAML inputs, then renders an aligned two-column view where:
     *    - unchanged lines appear on BOTH sides at the same row
     *    - removed-only lines appear on the left, blank on the right
     *    - added-only lines appear on the right, blank on the left
     *
     *  Each row has a gutter showing line number + change marker
     *  (-, +, or space). That's the standard pattern in VS Code,
     *  GitHub PR view, etc. — far more readable for YAML diffs than
     *  the previous "tint lines not found in the other side" approach
     *  because rows actually line up across panes. */
    _renderSideBySideDiff(original, refined, leftLabel = "Current YAML", rightLabel = "Refined YAML") {
        const rows = this._alignDiffRows(original.split("\n"), refined.split("\n"));
        const cell = ({ lineNum, text, marker }, side) => {
            const bg = marker === "-"
                ? "rgba(244, 67, 54, 0.10)"
                : marker === "+"
                    ? "rgba(76, 175, 80, 0.12)"
                    : "transparent";
            const color = marker === "-"
                ? "var(--error-color, #c62828)"
                : marker === "+"
                    ? "var(--success-color, #2e7d32)"
                    : "var(--primary-text-color)";
            // Inert empty cell — keeps row alignment when one side has no
            // content for this row.
            if (text === null) {
                return b `<div
          style="background:${bg}; min-height:1.2em; border-right: 1px solid var(--divider-color, rgba(0,0,0,0.06));"
        ></div>`;
            }
            return b `<div
        style="background:${bg}; color:${color}; white-space:pre; min-height:1.2em; display:flex; gap:6px; font-family: var(--code-font-family, monospace); border-right: 1px solid var(--divider-color, rgba(0,0,0,0.06)); padding: 0 6px;"
      ><span
          style="opacity:0.4; user-select:none; min-width:3ch; text-align:right;"
        >${lineNum ?? ""}</span><span
          style="opacity:0.55; user-select:none; width:1ch;"
        >${marker}</span><span>${text || " "}</span></div>`;
        };
        return b `<div
      style="margin-bottom: 8px;"
    >
      <div
        class="diff-header"
        style="display:grid; grid-template-columns: 1fr 1fr; gap: 0; font-weight: 500; font-size:0.88em; margin-bottom: 4px;"
      >
        <div style="border-bottom: 2px solid var(--error-color, #c62828); padding-bottom: 2px;">
          ${leftLabel}
        </div>
        <div style="border-bottom: 2px solid var(--success-color, #4caf50); padding-bottom: 2px; padding-left: 8px;">
          ${rightLabel}
        </div>
      </div>
      <div
        class="diff-pane"
        style="max-height:55vh; overflow:auto; font-size:0.82em; background: var(--code-background-color, rgba(0,0,0,0.03)); border-radius: 4px; border: 1px solid var(--divider-color, rgba(0,0,0,0.10));"
      >
        <div class="diff-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap: 0;">
          ${rows.map((r) => b `${cell({
            lineNum: r.leftLineNum,
            text: r.leftText,
            marker: r.leftMarker,
        })}${cell({
            lineNum: r.rightLineNum,
            text: r.rightText,
            marker: r.rightMarker,
        })}`)}
        </div>
      </div>
    </div>`;
    }
    /** Compute aligned diff rows using LCS line matching. Returns an
     *  array where each row has both a left and right cell — empty
     *  on one side means the line was inserted/deleted there.
     *
     *  Algorithm: standard O(m*n) LCS table over line equality, then
     *  walk backwards to reconstruct the diff. For automation YAMLs
     *  (typically 20-200 lines) the dp table is tiny — milliseconds
     *  even on a Raspberry Pi. */
    _alignDiffRows(a, b) {
        const m = a.length;
        const n = b.length;
        // dp[i][j] = LCS length of a[0..i) vs b[0..j)
        const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (a[i - 1] === b[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1] + 1;
                }
                else {
                    dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
                }
            }
        }
        const ops = [];
        let i = m;
        let j = n;
        while (i > 0 && j > 0) {
            if (a[i - 1] === b[j - 1]) {
                ops.push({ type: "=", a: i - 1, b: j - 1 });
                i--;
                j--;
            }
            else if (dp[i - 1][j] >= dp[i][j - 1]) {
                ops.push({ type: "-", a: i - 1 });
                i--;
            }
            else {
                ops.push({ type: "+", b: j - 1 });
                j--;
            }
        }
        while (i > 0) {
            ops.push({ type: "-", a: i - 1 });
            i--;
        }
        while (j > 0) {
            ops.push({ type: "+", b: j - 1 });
            j--;
        }
        ops.reverse();
        // Convert flat ops into aligned rows. Consecutive `-` and `+`
        // ops get paired (one on each side); leftover ones get a blank
        // cell on the opposite side.
        const rows = [];
        let k = 0;
        while (k < ops.length) {
            const op = ops[k];
            if (op.type === "=") {
                rows.push({
                    leftLineNum: op.a + 1,
                    leftText: a[op.a],
                    leftMarker: " ",
                    rightLineNum: op.b + 1,
                    rightText: b[op.b],
                    rightMarker: " ",
                });
                k++;
                continue;
            }
            // Group a run of - and + ops, then pair them up
            const minus = [];
            const plus = [];
            while (k < ops.length && ops[k].type !== "=") {
                const o = ops[k];
                if (o.type === "-")
                    minus.push(o.a);
                else
                    plus.push(o.b);
                k++;
            }
            const max = Math.max(minus.length, plus.length);
            for (let p = 0; p < max; p++) {
                const lh = p < minus.length ? minus[p] : null;
                const rh = p < plus.length ? plus[p] : null;
                rows.push({
                    leftLineNum: lh !== null ? lh + 1 : null,
                    leftText: lh !== null ? a[lh] : null,
                    leftMarker: lh !== null ? "-" : " ",
                    rightLineNum: rh !== null ? rh + 1 : null,
                    rightText: rh !== null ? b[rh] : null,
                    rightMarker: rh !== null ? "+" : " ",
                });
            }
        }
        return rows;
    }
    /** Render a token-usage pill row under the rationale.
     *
     *  We get byte counts from the backend, not exact token counts —
     *  the HA Conversation API doesn't surface provider-side token
     *  metering, so we estimate via the standard ~4 chars/token rule
     *  used by both OpenAI and Anthropic tokenizer docs. Labelled
     *  "≈" to flag the approximation.
     *
     *  Returns nothing for the cached / deterministic-preview path
     *  (bytes_sent === 0 means we never made an LLM call).
     */
    _renderTokenUsage(bytesSent, bytesReceived) {
        if (!bytesSent && !bytesReceived)
            return A;
        const inTokens = Math.round((bytesSent ?? 0) / 4);
        const outTokens = Math.round((bytesReceived ?? 0) / 4);
        if (inTokens === 0 && outTokens === 0)
            return A;
        return b `<div
      style="margin: -6px 0 12px 0; font-size: 0.8em; color: var(--secondary-text-color);"
      title="Token counts are approximate (estimated from response byte length ÷ 4). HA's Conversation API doesn't expose provider-side token meters; bytes_sent/bytes_received are what we measure."
    >
      ≈ ${inTokens.toLocaleString()} in / ${outTokens.toLocaleString()} out tokens
      (${(bytesSent ?? 0).toLocaleString()}B sent · ${(bytesReceived ?? 0).toLocaleString()}B received)
    </div>`;
    }
    _renderRefineAutomationModal() {
        const m = this._refineAutomationModal;
        if (!m)
            return A;
        return b `<div
      class="dialog-backdrop"
      @click=${this._closeRefineAutomationModal}
    >
      <div
        class="dialog dialog-wide"
        @click=${(e) => e.stopPropagation()}
      >
        <div class="dialog-header">
          <div class="dialog-title">
            ${m.refinedSource === "deterministic"
            ? b `📋 Preview deterministic fix for '${m.alias}'`
            : m.refinedSource === "stage-two"
                ? b `📋 + 🤖 Algorithm + LLM refine of '${m.alias}'`
                : b `✏️ Refine '${m.alias}' with AI`}
          </div>
          <button
            class="dialog-close"
            aria-label="Close"
            @click=${this._closeRefineAutomationModal}
          >×</button>
        </div>
        <div class="dialog-body">
          ${m.error
            ? b `<div
                class="error-banner"
                style="margin-bottom: 12px; border-radius: 6px;"
              >${m.error}</div>`
            : A}
          ${m.busy
            ? b `<div style="padding: 12px;">⏳ Working…</div>`
            : A}
          ${!m.refinedYaml && !m.busy
            ? b `
                <div style="margin-bottom: 8px; font-weight: 500;">
                  Current automation
                </div>
                ${m.originalYaml
                ? b `<pre
                      style="max-height: 280px; overflow: auto; background: var(--code-background-color, rgba(0,0,0,0.04)); padding: 12px; border-radius: 4px; font-size: 0.85em;"
                    >${m.originalYaml}</pre>`
                : b `<div
                      style="padding: 10px; margin-bottom: 8px; background: rgba(255, 152, 0, 0.10); border-left: 3px solid var(--warning-color, #ff9800); border-radius: 4px; font-size: 0.9em;"
                    >⚠️ Couldn't load the automation's YAML. HA's
                    automation registry returned an empty record for
                    this id. You can still describe a change below,
                    but the LLM won't have the existing YAML for
                    context — quality of the suggestion will be lower.</div>`}
                <div style="margin-top: 16px; margin-bottom: 8px; font-weight: 500;">
                  What should change?
                </div>
                <textarea
                  rows="4"
                  style="width: 100%; padding: 8px; box-sizing: border-box; font-family: inherit;"
                  placeholder="e.g. 'Move the trigger 10 minutes earlier' or 'Skip on weekends' or 'Add a notification when it fires'"
                  .value=${m.feedback}
                  @input=${(e) => {
                if (this._refineAutomationModal) {
                    this._refineAutomationModal = {
                        ...this._refineAutomationModal,
                        feedback: e.target.value,
                    };
                }
            }}
                  ?disabled=${m.busy}
                ></textarea>
              `
            : A}
          ${m.refinedYaml
            ? b `
                ${m.rationale
                ? b `<div
                      style="margin-bottom: 12px; padding: 10px; background: var(--info-background-color, rgba(33, 150, 243, 0.08)); border-left: 3px solid var(--info-color, #2196f3); border-radius: 4px;"
                    ><strong>Why these changes:</strong> ${m.rationale}</div>`
                : A}
                ${this._renderTokenUsage(m.bytesSent, m.bytesReceived)}
                ${m.diffSummary && m.diffSummary.length > 0
                ? b `<ul
                      style="margin: 0 0 12px 0; padding-left: 20px;"
                    >${m.diffSummary.map((line) => b `<li>${line}</li>`)}</ul>`
                : A}
                ${this._renderSideBySideDiff(m.originalYaml ?? "", m.refinedYaml, m.refinedSource === "stage-two"
                ? "Algorithm Output (stage 1)"
                : m.refinedSource === "deterministic"
                    ? "Current YAML (live)"
                    : "Current YAML", m.refinedSource === "deterministic"
                ? "Algorithm Fix (no LLM)"
                : m.refinedSource === "stage-two"
                    ? "LLM Refinement (stage 2)"
                    : "Refined by LLM")}
              `
            : A}
        </div>
        ${m.refinedYaml && m.auditInsightId
            ? b `<div
              style="border-top: 1px solid var(--divider-color, rgba(0,0,0,0.1)); padding: 10px 16px; background: var(--secondary-background-color, rgba(0,0,0,0.02));"
              @click=${(e) => e.stopPropagation()}
            >
              <div style="font-size: 0.85em; font-weight: 500; margin-bottom: 4px;">
                ${m.refinedSource === "deterministic"
                ? "🤖 Take this further with the LLM?"
                : "🤖 Refine again with more guidance?"}
              </div>
              <textarea
                rows="2"
                style="width: 100%; padding: 6px 8px; box-sizing: border-box; font-family: inherit; font-size: 0.88em;"
                placeholder=${m.refinedSource === "deterministic"
                ? "Optional — describe any extra changes (e.g. 'also disable on holidays', 'add a notification')"
                : "Optional follow-up feedback for another LLM pass…"}
                .value=${m.feedback}
                @input=${(e) => {
                if (this._refineAutomationModal) {
                    this._refineAutomationModal = {
                        ...this._refineAutomationModal,
                        feedback: e.target.value,
                    };
                }
            }}
                ?disabled=${m.busy}
              ></textarea>
              <div style="display: flex; justify-content: flex-end; margin-top: 6px;">
                <button
                  class="pill-action"
                  ?disabled=${m.busy}
                  @click=${this._refineFurtherWithLlm}
                  title="${m.refinedSource === 'deterministic'
                ? 'Send the algorithm result + your extra feedback to the LLM for further refinement (uses tokens).'
                : 'Send the current refined YAML + your follow-up back through the LLM.'}"
                >${m.busy
                ? "Thinking…"
                : m.refinedSource === "deterministic"
                    ? "🤖 Refine further with LLM"
                    : "🤖 Refine again"}</button>
              </div>
            </div>`
            : A}
        <div class="dialog-footer">
          ${!m.refinedYaml
            ? b `<button
                @click=${this._submitRefineAutomation}
                ?disabled=${m.busy || !m.feedback.trim()}
              >${m.busy ? "Refining…" : "Refine with AI"}</button>`
            : b `
                <button
                  @click=${() => {
                if (this._refineAutomationModal) {
                    this._refineAutomationModal = {
                        ...this._refineAutomationModal,
                        refinedYaml: undefined,
                        refinedConfig: undefined,
                        rationale: undefined,
                        diffSummary: undefined,
                    };
                }
            }}
                  ?disabled=${m.busy}
                >Discard</button>
                <button
                  class="primary"
                  @click=${this._applyRefineAutomation}
                  ?disabled=${m.busy}
                  title=${m.refinedSource === "deterministic"
                ? "Write the algorithm's deterministic fix to automations.yaml"
                : m.refinedSource === "stage-two"
                    ? "Write the LLM's stage-2 refinement to automations.yaml"
                    : "Write this refined YAML to automations.yaml"}
                >${m.busy
                ? "Applying…"
                : m.refinedSource === "deterministic"
                    ? "Apply algorithm fix"
                    : m.refinedSource === "stage-two"
                        ? "Apply stage-2 result"
                        : "Apply refinement"}</button>
              `}
        </div>
      </div>
    </div>`;
    }
    /** Render insight.created_at as a relative-time pill ("3h ago" / "yesterday").
     *  Returns "" for very fresh (<5min) so we don't clutter brand-new rows. */
    _formatAge(createdAt) {
        if (!createdAt)
            return "";
        const created = new Date(createdAt).getTime();
        if (Number.isNaN(created))
            return "";
        const seconds = Math.floor((Date.now() - created) / 1000);
        if (seconds < 5 * 60)
            return "";
        if (seconds < 60 * 60) {
            const m = Math.floor(seconds / 60);
            return `${m}m ago`;
        }
        if (seconds < 24 * 60 * 60) {
            const h = Math.floor(seconds / 3600);
            return `${h}h ago`;
        }
        const days = Math.floor(seconds / (24 * 60 * 60));
        if (days === 1)
            return "yesterday";
        if (days < 14)
            return `${days}d ago`;
        const weeks = Math.floor(days / 7);
        return `${weeks}w ago`;
    }
    /** Per-row trust indicator. Mirrors the header privacy mode but at row
     *  level so users have a constant reminder of what *any* LLM action on
     *  this row will do. Suppressed in OFF mode (no LLM = no trust concern).
     */
    /**
     * Maturity pill — shows BETA / EXPERIMENTAL when the insight comes
     * from a detector that hasn't been field-tested yet. STABLE insights
     * get no pill (no chrome for the default case). Sets honest
     * expectations so users know "this output might be wrong, please
     * tell us" vs "this should be reliable."
     *
     * Sources `insight.maturity` (field on the Insight dataclass, set
     * from the Detector class at scan time, surfaced via ws_list +
     * subscribe).
     */
    _renderMaturityPill(insight) {
        const maturity = insight.maturity;
        if (!maturity || maturity === "stable")
            return A;
        if (maturity === "beta") {
            return b `
        <span
          class="pill"
          style="background: rgba(255, 193, 7, 0.18); color: #b8860b;"
          title="BETA — this detector ships but hasn't been field-tested across diverse installs. Insights may have edge-case false positives. Dismiss feedback helps promote it to STABLE."
        >🟡 BETA</span>
      `;
        }
        if (maturity === "experimental") {
            return b `
        <span
          class="pill"
          style="background: rgba(156, 39, 176, 0.18); color: #6a1b9a;"
          title="EXPERIMENTAL — this detector is new. Output may be inaccurate or noisy. Was this useful? Dismiss or apply to teach the project what works."
        >🧪 EXPERIMENTAL</span>
      `;
        }
        return A;
    }
    _renderTrustPill() {
        const mode = this._hello?.privacy_mode;
        if (!mode || mode === "off")
            return A;
        if (mode === "local") {
            return b `
        <span
          class="pill"
          style="background: rgba(76, 175, 80, 0.18); color: var(--success-color, #2e7d32);"
          title="LLM actions on this insight stay on your local network"
        >🟢 local</span>
      `;
        }
        return b `
      <span
        class="pill"
        style="background: rgba(255, 152, 0, 0.18); color: var(--warning-color, #e65100);"
        title="LLM actions on this insight send pseudonymized data to a cloud LLM"
      >🟡 cloud</span>
    `;
    }
    _renderDiff(diff) {
        return b `
      <ul class="diff-list">
        ${diff.map((line) => {
            const cls = line.startsWith("+")
                ? "diff-add"
                : line.startsWith("-")
                    ? "diff-remove"
                    : "diff-change";
            return b `<li class=${cls}>${line}</li>`;
        })}
      </ul>
    `;
    }
    _renderFeedbackInput(insight, label) {
        const feedback = this._feedbackById.get(insight.id) ?? "";
        return b `
      <div class="feedback">
        <h5>${label}</h5>
        <textarea
          placeholder="e.g. Add a sun.below_horizon condition; change debounce to 10s; only run when nobody is home"
          .value=${feedback}
          @input=${(e) => {
            const value = e.target.value;
            const next = new Map(this._feedbackById);
            if (value)
                next.set(insight.id, value);
            else
                next.delete(insight.id);
            this._feedbackById = next;
        }}
        ></textarea>
      </div>
    `;
    }
    _renderRefinedPreview(insight, refined) {
        const busy = this._busyId === insight.id;
        return b `
      <div class="refined-banner">
        <strong>✨ Refined version proposed</strong>
        ${refined.rationale ?? "(no rationale provided)"}
        ${refined.diffSummary.length > 0
            ? this._renderDiff(refined.diffSummary)
            : b `<div style="margin-top: 6px; font-style: italic;">
              No top-level changes detected.
            </div>`}
      </div>
      <h4>Original vs refined</h4>
      <div class="compare">
        <div class="compare-col">
          <h5>Original</h5>
          <pre>${JSON.stringify(insight.payload, null, 2)}</pre>
        </div>
        <div class="compare-col refined">
          <h5>Refined</h5>
          <pre>${JSON.stringify(refined.payload, null, 2)}</pre>
        </div>
      </div>
      <h4>Edit refined before Apply</h4>
      ${this._renderPayloadView(insight, refined.payload)}
      ${this._renderPreview(insight)}
      ${this._renderRename(insight, refined)}
      ${this._renderFeedbackInput(insight, "Ask the LLM for further changes")}
      <div class="explain-row">
        <button
          class="action ${this._refineBusy ? "busy-pulse" : ""}"
          ?disabled=${this._refineBusy}
          @click=${() => this._refine(insight)}
        >
          ${this._refineBusy
            ? "💭 refining…"
            : `Refine again (turn ${(this._refineTurnsById.get(insight.id) ?? 0) + 1})`}
        </button>
        <button
          class="action"
          ?disabled=${this._testBusy}
          title="Fire the refined action(s) for real"
          @click=${() => this._testActions(insight, refined.payload)}
        >
          ${this._testBusy ? "testing…" : "🔥 Test refined"}
        </button>
        <button class="action" @click=${() => this._keepOriginal(insight.id)}>
          Keep original
        </button>
      </div>
      <div class="dialog-footer">
        <button class="action" ?disabled=${busy} @click=${() => this._dismiss(insight)}>
          Dismiss
        </button>
        <button
          class="action primary"
          ?disabled=${busy}
          @click=${() => this._apply(insight, refined.payload)}
        >
          ${busy ? "applying…" : "Apply refined"}
        </button>
      </div>
    `;
    }
    /**
     * v1.5.11 — Setup-guide dialog body for setup_quality insights.
     *
     * Why this exists separately from the generic dialog body: the
     * default body assumes the insight has YAML to refine/apply. It
     * shows a JSON payload editor, "Customize" rename form, "Notes
     * for the LLM" textarea, etc. setup_quality insights are
     * observational — they tell the user "wire X to unlock detector
     * Y". The actionable surface is a deep-link to the right HA
     * settings page, not a YAML editor.
     *
     * Handles BOTH:
     *   - summary insights (fingerprint.kind = "setup_quality_summary")
     *     payload contains `setup_steps` — a full per-feature roll-up.
     *   - per-feature insights (fingerprint.kind = "setup_quality_feature")
     *     payload contains single-feature shape — we synthesize a
     *     one-item list so the same renderer handles both.
     */
    _renderSetupGuideBody(insight) {
        const busy = this._busyId === insight.id;
        const confidencePct = Math.round(insight.confidence * 100);
        const payload = (insight.payload ?? {});
        const steps = Array.isArray(payload.setup_steps)
            ? payload.setup_steps
            : payload.feature_key
                ? [
                    {
                        feature: payload.feature,
                        feature_key: payload.feature_key,
                        tier: payload.tier,
                        advice: payload.advice ?? "",
                        next_step: payload.next_step ?? "",
                        scenarios: payload.scenarios_unlocked ?? [],
                        setup_url: payload.setup_url ?? null,
                        setup_url_label: payload.setup_url_label ?? null,
                        setup_url_external: !!payload.setup_url_external,
                    },
                ]
                : [];
        const scorePct = typeof payload.score === "number"
            ? Math.round(payload.score * 100)
            : null;
        return b `
      <div class="dialog-body setup-guide-body">
        ${this._renderModalError()}
        <div class="row-meta">
          <span class="pill">confidence ${confidencePct}%</span>
          <span class="pill">${insight.detector}</span>
          ${scorePct !== null
            ? b `<span class="pill">${scorePct}% complete</span>`
            : A}
        </div>
        ${insight.explanation
            ? b `<div class="explanation">${insight.explanation}</div>`
            : A}
        ${steps.length > 0
            ? b `
              <h4 style="margin-top:16px;">Features &amp; setup steps</h4>
              <div class="setup-steps">
                ${steps.map((s) => this._renderSetupStep(s))}
              </div>
            `
            : b `
              <div class="setup-stale-banner">
                <strong>This insight was created before v1.5.11.</strong>
                Re-scan to populate per-feature setup steps with deep-link
                buttons. Until then, the actions live inline in the
                explanation above.
                <div class="setup-stale-action">
                  <button
                    class="action primary"
                    ?disabled=${this._scanBusy}
                    @click=${this._runScanNow}
                    title="Refresh insights — regenerates this card with deep-link buttons for each setup step"
                  >
                    ${this._scanBusy ? "Scanning…" : "🔍 Run scan now"}
                  </button>
                </div>
              </div>
            `}
        <div class="subtitle" style="margin-top:12px;">
          After changing a setting, run Settings → Devices &amp; Services →
          HA Insights → <em>Scan now</em> to refresh setup completeness.
        </div>
      </div>
      <div class="dialog-footer">
        <button class="action" ?disabled=${busy} @click=${() => this._dismiss(insight)}>
          Dismiss
        </button>
        <button class="action" ?disabled=${busy} @click=${() => this._snooze(insight)}>
          Snooze 7d
        </button>
      </div>
    `;
    }
    /** v1.2.16 — Dedicated dialog body for automation_audit insights.
     *
     *  Pre-v1.2.16 audit insights shared the generic Refine-flow body,
     *  which:
     *    - Surfaced raw JSON payload front and center (the user has no
     *      use for the internal observation list shape).
     *    - Showed a Customize block (Alias / Description / "Notes for
     *      the LLM") that renames the *insight* — meaningless for an
     *      audit observation that already names an automation by alias.
     *    - Buried 🤖 Suggest improvements at the bottom and offered no
     *      direct link to the automation it was complaining about.
     *
     *  v1.2.16 renders observations as a structured list with per-kind
     *  icons + actions, promotes 🤖 Suggest as the primary CTA, and
     *  exposes a deeplink to /config/automation/edit/{automation_id}
     *  for the "fix it manually" path. Raw payload moves behind a
     *  <details> disclosure for power users. Apply ─ which is a no-op
     *  for an observation-only audit ─ is hidden entirely. */
    _renderAuditBody(insight) {
        const busy = this._busyId === insight.id || this._auditSuggestBusy === insight.id;
        const confidencePct = Math.round(insight.confidence * 100);
        const payload = (insight.payload ?? {});
        const automationAlias = payload.automation_alias ?? "";
        const automationId = payload.automation_id ?? "";
        const advice = payload.advice ?? "";
        const observations = Array.isArray(payload.observations)
            ? payload.observations.filter((o) => typeof o === "object" && o !== null)
            : [];
        const targetEntities = Array.isArray(payload.target_entities)
            ? payload.target_entities.filter((e) => typeof e === "string")
            : [];
        const triggerEntities = Array.isArray(payload.trigger_entities)
            ? payload.trigger_entities.filter((e) => typeof e === "string")
            : [];
        const relatedIds = Array.isArray(payload.related_insight_ids)
            ? payload.related_insight_ids.filter((s) => typeof s === "string")
            : [];
        // entity_ids the audit has flagged as missing/silent so we can
        // mark them on the entity-pill list. Dedup'd Set lookup keeps
        // the per-pill check O(1).
        const silentEntities = new Set();
        for (const o of observations) {
            if (o.kind === "entity_silent"
                && o.metrics
                && typeof o.metrics.entity_id === "string") {
                silentEntities.add(o.metrics.entity_id);
            }
        }
        const editorUrl = automationId
            ? `/config/automation/edit/${automationId}`
            : "";
        return b `
      <div class="dialog-body audit-body">
        ${this._renderModalError()}
        <div class="row-meta">
          <span class="pill">confidence ${confidencePct}%</span>
          <span class="pill">automation_audit</span>
          ${insight.maturity === "beta"
            ? b `<span class="pill" style="color: var(--warning-color)">🟡 BETA</span>`
            : A}
        </div>
        ${automationAlias
            ? b `
              <div class="audit-automation-header">
                <div class="audit-automation-name">${automationAlias}</div>
                ${editorUrl
                ? b `<a
                      class="action primary"
                      href=${editorUrl}
                      target="_top"
                      title="Jump straight to this automation in HA's editor — fix it manually here"
                    >Open in editor →</a>`
                : A}
              </div>
            `
            : A}
        ${advice
            ? b `<div class="audit-advice">${advice}</div>`
            : A}
        ${observations.length > 0
            ? b `
              <h4 style="margin: 16px 0 4px 0;">
                Findings (${observations.length})
              </h4>
              <ul class="audit-findings">
                ${observations.map((o) => this._renderAuditFinding(o))}
              </ul>
            `
            : A}
        ${triggerEntities.length > 0 || targetEntities.length > 0
            ? b `
              <h4 style="margin: 16px 0 4px 0;">Entities</h4>
              <div class="audit-entity-grid">
                ${triggerEntities.length > 0
                ? b `
                      <div>
                        <div class="audit-entity-label">Trigger</div>
                        <div class="audit-entity-pills">
                          ${triggerEntities.map((e) => this._renderAuditEntityPill(e, silentEntities.has(e)))}
                        </div>
                      </div>
                    `
                : A}
                ${targetEntities.length > 0
                ? b `
                      <div>
                        <div class="audit-entity-label">Target</div>
                        <div class="audit-entity-pills">
                          ${targetEntities.map((e) => this._renderAuditEntityPill(e, silentEntities.has(e)))}
                        </div>
                      </div>
                    `
                : A}
              </div>
            `
            : A}
        ${relatedIds.length > 0
            ? b `
              <h4 style="margin: 16px 0 4px 0;">
                Related insights (${relatedIds.length})
              </h4>
              <div class="audit-related">
                ${relatedIds.map((id) => {
                const related = this._insights.find((i) => i.id === id);
                const label = related
                    ? this._displayTitle(related)
                    : `<${id.slice(0, 12)}…>`;
                return b `
                    <a
                      class="audit-related-link"
                      href="#"
                      @click=${(e) => {
                    e.preventDefault();
                    if (related)
                        this._openDialog(related.id);
                }}
                    >${label}</a>
                  `;
            })}
              </div>
            `
            : A}
        ${insight.explanation
            ? b `<div class="explanation">${insight.explanation}</div>`
            : A}
        <details class="audit-raw-payload">
          <summary>Show raw payload</summary>
          <pre class="payload-code">${JSON.stringify(insight.payload, null, 2)}</pre>
        </details>
      </div>
      <div class="dialog-footer">
        <button
          class="action primary"
          ?disabled=${busy}
          @click=${() => this._runAuditSuggest(insight)}
          title="Ask the LLM for specific YAML edits to fix these findings"
        >${this._auditSuggestBusy === insight.id
            ? "Thinking…"
            : "🤖 Suggest improvements"}</button>
        <button
          class="action"
          ?disabled=${busy}
          @click=${() => this._dismiss(insight)}
        >Dismiss</button>
        <button
          class="action"
          ?disabled=${busy}
          @click=${() => this._snooze(insight)}
        >Snooze 7d</button>
      </div>
    `;
    }
    /** One audit observation row. Kind-aware icon + a context action
     *  (entity link / scroll to editor / linked insight) so the user
     *  can act on each finding without leaving the dialog. */
    _renderAuditFinding(o) {
        const kindIcons = {
            entity_silent: "🔴",
            redundant_target: "🔁",
            long_on_duration: "⏱️",
            trigger_time_drift: "🕒",
            trace_dormant: "💤",
            trace_condition_blocks: "🚧",
            trace_action_errors: "❗",
            has_recent_insights: "📌",
            rollup_dow: "📅",
            rollup_dom: "📆",
            rollup_month: "🗓️",
            entity_stale_state: "🥶",
            cross_integration_coupling: "🌩️",
        };
        const icon = kindIcons[o.kind] ?? "•";
        const eid = typeof o.metrics?.entity_id === "string" ? o.metrics.entity_id : "";
        // Per-kind context action — small inline link so the user can act
        // on this specific finding without leaving the dialog.
        let action = A;
        if (o.kind === "entity_silent" && eid) {
            const url = `/config/entities?config_entry=&domain=&q=${encodeURIComponent(eid)}`;
            action = b `
        <a
          class="audit-finding-action"
          href=${url}
          target="_top"
          title="Open Entity Registry filtered to '${eid}' so you can rename, remove, or replace it"
        >Open entity →</a>
      `;
        }
        return b `
      <li class="audit-finding audit-finding--${o.kind}">
        <span class="audit-finding-icon">${icon}</span>
        <span class="audit-finding-text">${o.text}</span>
        ${action}
      </li>
    `;
    }
    /** Compact pill for an entity_id under Trigger / Target. The silent
     *  flag adds a red dot so the user spots the offending entity at a
     *  glance without scanning the findings list. */
    _renderAuditEntityPill(eid, silent) {
        return b `
      <span class="audit-entity-pill ${silent ? "is-silent" : ""}">
        ${silent ? b `<span class="silent-dot" title="Flagged silent / missing">●</span> ` : A}
        ${eid}
      </span>
    `;
    }
    _renderSetupStep(step) {
        const tier = step.tier ?? "USELESS";
        const tierBadge = {
            GREAT: { emoji: "✅", label: "Working great", cls: "ok" },
            GOOD: { emoji: "🟢", label: "Working", cls: "ok" },
            LIMITED: { emoji: "🟠", label: "Partial", cls: "warn" },
            USELESS: { emoji: "🔴", label: "Not configured", cls: "todo" },
        }[tier] ?? { emoji: "⚪", label: tier, cls: "" };
        const scenarios = Array.isArray(step.scenarios) ? step.scenarios : [];
        const showScenarios = tier !== "GREAT" && scenarios.length > 0;
        const signals = Array.isArray(step.signals) ? step.signals : [];
        const hasUrl = !!step.setup_url;
        const external = !!step.setup_url_external;
        // v1.2.15: setup URL is shown at every tier — including GREAT —
        // so users can verify or revisit the underlying config (Companion
        // App page, /config/devices etc). Pre-v1.2.15 the link was hidden
        // when tier === "GREAT", leaving the user with "Working great" and
        // no way to inspect WHAT was working. Same URL, different
        // call-to-action verb per tier.
        const linkVerb = tier === "GREAT" ? "Manage" : (step.setup_url_label ?? "Set this up");
        return b `
      <div class="setup-step setup-step--${tierBadge.cls}">
        <div class="setup-step-header">
          <span class="setup-step-tier">
            ${tierBadge.emoji} ${tierBadge.label}
          </span>
          <span class="setup-step-name">${step.feature ?? ""}</span>
        </div>
        ${step.advice
            ? b `<div class="setup-step-advice">${step.advice}</div>`
            : A}
        ${signals.length > 0
            ? b `
              <details class="setup-step-signals" ?open=${tier === "GREAT"}>
                <summary>Detected signals (${signals.length})</summary>
                <ul>
                  ${signals.map((s) => b `<li>${s}</li>`)}
                </ul>
              </details>
            `
            : A}
        ${showScenarios
            ? b `
              <details class="setup-step-scenarios">
                <summary>What this unlocks</summary>
                <ul>
                  ${scenarios.map((s) => b `<li>${s}</li>`)}
                </ul>
              </details>
            `
            : A}
        ${hasUrl
            ? external
                ? b `
                <div class="setup-step-action">
                  <a
                    class="action ${tier === "GREAT" ? "" : "primary"}"
                    href=${step.setup_url}
                    target="_blank"
                    rel="noopener"
                  >${linkVerb} ↗</a>
                </div>
              `
                : b `
                <div class="setup-step-action">
                  <a
                    class="action ${tier === "GREAT" ? "" : "primary"}"
                    href=${step.setup_url}
                  >${linkVerb} →</a>
                </div>
              `
            : tier !== "GREAT" && step.next_step
                ? b `<div class="setup-step-note">${step.next_step}</div>`
                : A}
        ${tier !== "GREAT" && step.feature_key === "presence_inference"
            ? b `
              <div class="setup-step-action">
                <button
                  class="action"
                  title="Open a bulk area-assignment dialog inside HA Insights — no leaving the panel"
                  @click=${() => {
                this._bulkAreaAssignOpen = true;
            }}
                >📍 Bulk assign in HA Insights</button>
              </div>
            `
            : A}
      </div>
    `;
    }
    _renderDialog() {
        if (!this._dialogId)
            return A;
        const insight = this._insights.find((i) => i.id === this._dialogId);
        if (!insight)
            return A;
        const busy = this._busyId === insight.id;
        const llmEnabled = this._hello?.privacy_mode && this._hello.privacy_mode !== "off";
        const ttsConfigured = Boolean(this._config.tts_target_entity_id);
        const confidencePct = Math.round(insight.confidence * 100);
        const refined = this._refinedById.get(insight.id);
        return b `
      <div class="dialog-backdrop" @click=${this._closeDialog}>
        <div class="dialog" @click=${(e) => e.stopPropagation()}>
          <div class="dialog-header">
            <div class="dialog-title">${this._displayTitle(insight)}</div>
            <button
              class="dialog-close"
              aria-label="Close"
              @click=${this._closeDialog}
            >×</button>
          </div>
          ${refined
            ? b `<div class="dialog-body">
                ${this._renderModalError()}
                ${this._renderTestResults()}
                ${this._renderRefinedPreview(insight, refined)}
              </div>`
            : insight.detector === "setup_quality"
                ? this._renderSetupGuideBody(insight)
                : insight.detector === "automation_audit"
                    && insight.payload_format !== "automation"
                    ? this._renderAuditBody(insight)
                    : b `
                <div class="dialog-body">
                  ${this._renderModalError()}
                  ${this._renderTestResults()}
                  <div class="row-meta">
                    <span class="pill">confidence ${confidencePct}%</span>
                    <span class="pill">${insight.detector}</span>
                    ${insight.area_id ? b `<span class="pill">${insight.area_id}</span>` : A}
                    ${insight.conflicts_with.length > 0
                        ? b `<span class="pill" style="color: var(--warning-color)">conflicts</span>`
                        : A}
                  </div>
                  <h4>${this._payloadHeading(insight.payload_format)}</h4>
                  ${this._renderPayloadView(insight)}
                  ${insight.explanation
                        ? b `<div class="explanation">${insight.explanation}</div>`
                        : A}
                  ${this._hypothesisById.has(insight.id)
                        ? b `<div class="explanation hypothesis">
                        <strong>Likely causes:</strong>
                        ${this._hypothesisById.get(insight.id)}
                      </div>`
                        : A}
                  ${this._renderPreview(insight)}
                  ${this._renderRename(insight, undefined)}
                  ${llmEnabled
                        ? this._renderFeedbackInput(insight, "Notes for the LLM (optional, used by Refine)")
                        : A}
                  <div class="explain-row">
                    ${llmEnabled && !insight.explanation
                        ? b `
                          <button
                            class="action ${this._explainBusy ? "busy-pulse" : ""}"
                            ?disabled=${this._explainBusy}
                            @click=${() => this._explain(insight)}
                          >
                            ${this._explainBusy ? "💭 thinking…" : "Explain with LLM"}
                          </button>
                        `
                        : A}
                    ${llmEnabled && insight.payload_format === "automation"
                        ? b `
                          <button
                            class="action ${this._refineBusy ? "busy-pulse" : ""}"
                            ?disabled=${this._refineBusy}
                            title="${this._refineConversationById.has(insight.id)
                            ? "Continue the LLM conversation with new feedback"
                            : "Ask the LLM to refine this automation"}"
                            @click=${() => this._refine(insight)}
                          >
                            ${this._refineBusy
                            ? "💭 refining…"
                            : this._refineConversationById.has(insight.id)
                                ? `✨ Refine again (turn ${(this._refineTurnsById.get(insight.id) ?? 0) + 1})`
                                : "✨ Refine with LLM"}
                          </button>
                          ${this._refineConversationById.has(insight.id)
                            ? b `<button
                                class="action"
                                title="Forget the prior conversation and start a fresh refine thread"
                                @click=${() => {
                                this._resetRefineConversation(insight.id);
                                this._toast = "Refine conversation reset";
                            }}
                              >
                                🔁 Reset conversation
                              </button>`
                            : A}
                        `
                        : A}
                    ${llmEnabled
                        ? b `
                          <button
                            class="action"
                            ?disabled=${this._previewBusy}
                            title="Preview the exact data that would be sent to the LLM"
                            @click=${() => this._previewRedaction(insight)}
                          >
                            ${this._previewBusy
                            ? "loading…"
                            : this._previewById.has(insight.id)
                                ? "🛡️ Hide preview"
                                : "🛡️ What gets sent?"}
                          </button>
                        `
                        : A}
                    ${llmEnabled && insight.kind === "anomaly"
                        ? b `
                          <button
                            class="action ${this._hypothesizeBusy ? "busy-pulse" : ""}"
                            ?disabled=${this._hypothesizeBusy}
                            title="Ask the LLM for plausible causes of this anomaly"
                            @click=${() => this._hypothesize(insight)}
                          >
                            ${this._hypothesizeBusy
                            ? "💭 thinking…"
                            : this._hypothesisById.has(insight.id)
                                ? "🔍 Re-hypothesize"
                                : "🔍 Get hypothesis"}
                          </button>
                        `
                        : A}
                    ${ttsConfigured && insight.explanation
                        ? b `
                          <button
                            class="action"
                            ?disabled=${this._ttsBusy}
                            title="Read aloud on ${this._config.tts_target_entity_id}"
                            @click=${() => this._readAloud(insight)}
                          >
                            ${this._ttsBusy ? "speaking…" : "🔊 Read aloud"}
                          </button>
                        `
                        : A}
                    ${insight.payload_format === "automation"
                        ? b `<button
                          class="action"
                          ?disabled=${this._testBusy}
                          title="Fire the action(s) for real"
                          @click=${() => this._testActions(insight)}
                        >
                          ${this._testBusy ? "testing…" : "🔥 Test actions"}
                        </button>`
                        : A}
                  </div>
                  ${!llmEnabled
                        ? b `<div class="subtitle" style="margin-top: 12px;">
                        LLM Explain / Refine disabled — enable Local or Cloud mode in
                        Settings → Devices & Services.
                      </div>`
                        : A}
                </div>
                <div class="dialog-footer">
                  <button class="action" ?disabled=${busy} @click=${() => this._dismiss(insight)}>
                    Dismiss
                  </button>
                  ${insight.applied_at
                        ? A
                        : b `<button
                        class="action"
                        ?disabled=${busy}
                        @click=${() => this._snooze(insight)}
                      >
                        Snooze 7d
                      </button>`}
                  ${insight.applied_at
                        ? b `<button
                        class="action primary"
                        ?disabled=${busy}
                        title="Remove the automation and revert this insight to active"
                        @click=${() => this._undo(insight)}
                      >
                        ${busy ? "undoing…" : "↶ Undo apply"}
                      </button>`
                        : insight.payload_format === "automation"
                            ? b `<button
                          class="action primary"
                          ?disabled=${busy}
                          @click=${() => this._apply(insight)}
                        >
                          ${busy ? "applying…" : "Apply"}
                        </button>`
                            : A}
                </div>
              `}
        </div>
      </div>
    `;
    }
    _renderErrorBanner() {
        if (!this._error)
            return A;
        return b `
      <div class="error-banner">
        <span>${this._error}</span>
        <button @click=${() => (this._error = undefined)}>Dismiss</button>
      </div>
    `;
    }
    render() {
        // v1.2.9: no "Loading…" curtain. The card renders based on data
        // it actually has — insights (the real payload), _hello (server
        // contact), _error (visible failure), _scanInProgress (transient).
        // Empty data + no contact yet = the normal empty state below
        // with a Refresh CTA, NOT a stuck "Loading…" screen.
        //
        // Scan-in-progress curtain. Hides the live-mutating subscribe stream
        // until the canonical post-scan ws_list lands via _refreshFromEvent.
        // Header stays visible so the user has context + can still click the
        // Stop button or other controls.
        if (this._scanInProgress) {
            return b `
        <ha-card>
          ${this._renderHeader()}
          <div class="empty empty-scanning">
            <div class="spinner" aria-hidden="true"></div>
            <div>Scanning…</div>
            <div class="empty-sub">
              Running detectors. Results appear when the scan finishes.
            </div>
          </div>
        </ha-card>
      `;
        }
        const rows = this._filtered();
        if (this._config.compact) {
            return b `
        <ha-card>
          ${this._renderSkewBanner()}
          ${this._renderErrorBanner()}
          ${this._renderCompactTile(rows)}
        </ha-card>
      `;
        }
        return b `
      <ha-card>
        ${this._renderHeader()}
        ${this._renderSkewBanner()}
        ${this._renderErrorBanner()}
        ${this._toast ? b `<div class="toast">${this._toast}</div>` : A}
        ${rows.length === 0
            ? b `<div class="empty">
              <div>Watching your home. New insights appear here as patterns emerge.</div>
              <div class="empty-actions">
                <button
                  ?disabled=${this._scanBusy}
                  @click=${this._runScanNow}
                  title="Run all detectors against the current state buffer"
                >
                  ${this._scanBusy ? "Scanning…" : "🔍 Run scan now"}
                </button>
                <a
                  href="https://github.com/botts7/ha-insights"
                  target="_blank"
                  rel="noopener"
                  title="Open the project README"
                >
                  How it works ↗
                </a>
              </div>
            </div>`
            : this._grouped(rows).flatMap(([key, items]) => key
                ? [
                    b `<div class="group-header">${key} (${items.length})</div>`,
                    ...items.map((i) => this._renderRow(i)),
                ]
                : items.map((i) => this._renderRow(i)))}
        ${this._renderTruncationFooter(rows.length)}
      </ha-card>
      ${this._renderDialog()}
      ${this._renderRefineAutomationModal()}
      <bulk-area-assign-dialog
        .hass=${this.hass}
        ?open=${this._bulkAreaAssignOpen}
        @closed=${() => {
            this._bulkAreaAssignOpen = false;
        }}
        @assignments-saved=${(e) => {
            const detail = e.detail;
            this._toast = `Areas saved: ${detail.saved}${detail.failed ? ` (${detail.failed} failed)` : ""}`;
        }}
      ></bulk-area-assign-dialog>
    `;
    }
    /** v1.2.3 — Footer that says "Showing N of M — +X more → View all".
     *  Only appears when the dashboard tile is sized to show fewer rows
     *  than the user actually has. Without it the tile shows 1 insight
     *  with no hint that 25 more are queued behind "View all" in the
     *  header. */
    _renderTruncationFooter(rendered) {
        const total = this._totalFilteredCount;
        if (total <= rendered)
            return A;
        const hidden = total - rendered;
        return b `
      <a class="truncation-footer" href="/ha-insights" title="Open the full HA Insights panel">
        Showing ${rendered} of ${total} — +${hidden} more →
      </a>
    `;
    }
}
__decorate([
    n({ attribute: false })
], HaInsightsCard.prototype, "hass", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_config", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_hello", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_insights", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_error", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_modalError", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_scanInProgress", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_busyId", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_toast", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_dialogId", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_explainBusy", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_auditSuggestBusy", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_ttsBusy", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_refineBusy", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_hypothesisById", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_hypothesizeBusy", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_refineConversationById", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_refineTurnsById", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_testBusy", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_scanBusy", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_refinedById", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_renameEdits", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_feedbackById", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_payloadEditsById", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_editingPayloadFor", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_payloadParseErrorById", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_previewById", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_previewBusy", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_testResults", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_expandedCohorts", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_refineAutomationModal", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_bulkAreaAssignOpen", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_autoMaxRows", void 0);
__decorate([
    r()
], HaInsightsCard.prototype, "_totalFilteredCount", void 0);
// Guard against double-registration: ha-insights-card.js and
// ha-insights-panel.js both ship this class (panel imports card to
// embed it). When the user has the card resource loaded AND the
// integration auto-registers the panel JS, both bundles try to
// define("ha-insights-card") and the second throws. The .get() check
// makes the second load a no-op.
if (!customElements.get("ha-insights-card")) {
    customElements.define("ha-insights-card", HaInsightsCard);
}
window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "ha-insights-card")) {
    window.customCards.push({
        type: "ha-insights-card",
        name: "HA Insights Card",
        description: "Shows insights from the HA Insights integration",
    });
}

export { HaInsightsCard };
//# sourceMappingURL=ha-insights-card.js.map
