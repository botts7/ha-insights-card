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
const t$1=globalThis,e$2=t$1.ShadowRoot&&(void 0===t$1.ShadyCSS||t$1.ShadyCSS.nativeShadow)&&"adoptedStyleSheets"in Document.prototype&&"replace"in CSSStyleSheet.prototype,s$2=Symbol(),o$4=new WeakMap;let n$3 = class n{constructor(t,e,o){if(this._$cssResult$=true,o!==s$2)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=t,this.t=e;}get styleSheet(){let t=this.o;const s=this.t;if(e$2&&void 0===t){const e=void 0!==s&&1===s.length;e&&(t=o$4.get(s)),void 0===t&&((this.o=t=new CSSStyleSheet).replaceSync(this.cssText),e&&o$4.set(s,t));}return t}toString(){return this.cssText}};const r$4=t=>new n$3("string"==typeof t?t:t+"",void 0,s$2),i$3=(t,...e)=>{const o=1===t.length?t[0]:e.reduce((e,s,o)=>e+(t=>{if(true===t._$cssResult$)return t.cssText;if("number"==typeof t)return t;throw Error("Value passed to 'css' function must be a 'css' function result: "+t+". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.")})(s)+t[o+1],t[0]);return new n$3(o,t,s$2)},S$1=(s,o)=>{if(e$2)s.adoptedStyleSheets=o.map(t=>t instanceof CSSStyleSheet?t:t.styleSheet);else for(const e of o){const o=document.createElement("style"),n=t$1.litNonce;void 0!==n&&o.setAttribute("nonce",n),o.textContent=e.cssText,s.appendChild(o);}},c$2=e$2?t=>t:t=>t instanceof CSSStyleSheet?(t=>{let e="";for(const s of t.cssRules)e+=s.cssText;return r$4(e)})(t):t;

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
const t=globalThis,i$1=t=>t,s$1=t.trustedTypes,e=s$1?s$1.createPolicy("lit-html",{createHTML:t=>t}):void 0,h="$lit$",o$2=`lit$${Math.random().toFixed(9).slice(2)}$`,n$1="?"+o$2,r$2=`<${n$1}>`,l=document,c=()=>l.createComment(""),a=t=>null===t||"object"!=typeof t&&"function"!=typeof t,u=Array.isArray,d=t=>u(t)||"function"==typeof t?.[Symbol.iterator],f="[ \t\n\f\r]",v=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,_=/-->/g,m=/>/g,p=RegExp(`>|${f}(?:([^\\s"'>=/]+)(${f}*=${f}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,"g"),g=/'/g,$=/"/g,y=/^(?:script|style|textarea|title)$/i,x=t=>(i,...s)=>({_$litType$:t,strings:i,values:s}),b=x(1),E=Symbol.for("lit-noChange"),A=Symbol.for("lit-nothing"),C=new WeakMap,P=l.createTreeWalker(l,129);function V(t,i){if(!u(t)||!t.hasOwnProperty("raw"))throw Error("invalid template strings array");return void 0!==e?e.createHTML(i):i}const N=(t,i)=>{const s=t.length-1,e=[];let n,l=2===i?"<svg>":3===i?"<math>":"",c=v;for(let i=0;i<s;i++){const s=t[i];let a,u,d=-1,f=0;for(;f<s.length&&(c.lastIndex=f,u=c.exec(s),null!==u);)f=c.lastIndex,c===v?"!--"===u[1]?c=_:void 0!==u[1]?c=m:void 0!==u[2]?(y.test(u[2])&&(n=RegExp("</"+u[2],"g")),c=p):void 0!==u[3]&&(c=p):c===p?">"===u[0]?(c=n??v,d=-1):void 0===u[1]?d=-2:(d=c.lastIndex-u[2].length,a=u[1],c=void 0===u[3]?p:'"'===u[3]?$:g):c===$||c===g?c=p:c===_||c===m?c=v:(c=p,n=void 0);const x=c===p&&t[i+1].startsWith("/>")?" ":"";l+=c===v?s+r$2:d>=0?(e.push(a),s.slice(0,d)+h+s.slice(d)+o$2+x):s+o$2+(-2===d?i:x);}return [V(t,l+(t[s]||"<?>")+(2===i?"</svg>":3===i?"</math>":"")),e]};class S{constructor({strings:t,_$litType$:i},e){let r;this.parts=[];let l=0,a=0;const u=t.length-1,d=this.parts,[f,v]=N(t,i);if(this.el=S.createElement(f,e),P.currentNode=this.el.content,2===i||3===i){const t=this.el.content.firstChild;t.replaceWith(...t.childNodes);}for(;null!==(r=P.nextNode())&&d.length<u;){if(1===r.nodeType){if(r.hasAttributes())for(const t of r.getAttributeNames())if(t.endsWith(h)){const i=v[a++],s=r.getAttribute(t).split(o$2),e=/([.?@])?(.*)/.exec(i);d.push({type:1,index:l,name:e[2],strings:s,ctor:"."===e[1]?I:"?"===e[1]?L:"@"===e[1]?z:H}),r.removeAttribute(t);}else t.startsWith(o$2)&&(d.push({type:6,index:l}),r.removeAttribute(t));if(y.test(r.tagName)){const t=r.textContent.split(o$2),i=t.length-1;if(i>0){r.textContent=s$1?s$1.emptyScript:"";for(let s=0;s<i;s++)r.append(t[s],c()),P.nextNode(),d.push({type:2,index:++l});r.append(t[i],c());}}}else if(8===r.nodeType)if(r.data===n$1)d.push({type:2,index:l});else {let t=-1;for(;-1!==(t=r.data.indexOf(o$2,t+1));)d.push({type:7,index:l}),t+=o$2.length-1;}l++;}}static createElement(t,i){const s=l.createElement("template");return s.innerHTML=t,s}}function M(t,i,s=t,e){if(i===E)return i;let h=void 0!==e?s._$Co?.[e]:s._$Cl;const o=a(i)?void 0:i._$litDirective$;return h?.constructor!==o&&(h?._$AO?.(false),void 0===o?h=void 0:(h=new o(t),h._$AT(t,s,e)),void 0!==e?(s._$Co??=[])[e]=h:s._$Cl=h),void 0!==h&&(i=M(t,h._$AS(t,i.values),h,e)),i}class R{constructor(t,i){this._$AV=[],this._$AN=void 0,this._$AD=t,this._$AM=i;}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(t){const{el:{content:i},parts:s}=this._$AD,e=(t?.creationScope??l).importNode(i,true);P.currentNode=e;let h=P.nextNode(),o=0,n=0,r=s[0];for(;void 0!==r;){if(o===r.index){let i;2===r.type?i=new k(h,h.nextSibling,this,t):1===r.type?i=new r.ctor(h,r.name,r.strings,this,t):6===r.type&&(i=new Z(h,this,t)),this._$AV.push(i),r=s[++n];}o!==r?.index&&(h=P.nextNode(),o++);}return P.currentNode=l,e}p(t){let i=0;for(const s of this._$AV) void 0!==s&&(void 0!==s.strings?(s._$AI(t,s,i),i+=s.strings.length-2):s._$AI(t[i])),i++;}}class k{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(t,i,s,e){this.type=2,this._$AH=A,this._$AN=void 0,this._$AA=t,this._$AB=i,this._$AM=s,this.options=e,this._$Cv=e?.isConnected??true;}get parentNode(){let t=this._$AA.parentNode;const i=this._$AM;return void 0!==i&&11===t?.nodeType&&(t=i.parentNode),t}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(t,i=this){t=M(this,t,i),a(t)?t===A||null==t||""===t?(this._$AH!==A&&this._$AR(),this._$AH=A):t!==this._$AH&&t!==E&&this._(t):void 0!==t._$litType$?this.$(t):void 0!==t.nodeType?this.T(t):d(t)?this.k(t):this._(t);}O(t){return this._$AA.parentNode.insertBefore(t,this._$AB)}T(t){this._$AH!==t&&(this._$AR(),this._$AH=this.O(t));}_(t){this._$AH!==A&&a(this._$AH)?this._$AA.nextSibling.data=t:this.T(l.createTextNode(t)),this._$AH=t;}$(t){const{values:i,_$litType$:s}=t,e="number"==typeof s?this._$AC(t):(void 0===s.el&&(s.el=S.createElement(V(s.h,s.h[0]),this.options)),s);if(this._$AH?._$AD===e)this._$AH.p(i);else {const t=new R(e,this),s=t.u(this.options);t.p(i),this.T(s),this._$AH=t;}}_$AC(t){let i=C.get(t.strings);return void 0===i&&C.set(t.strings,i=new S(t)),i}k(t){u(this._$AH)||(this._$AH=[],this._$AR());const i=this._$AH;let s,e=0;for(const h of t)e===i.length?i.push(s=new k(this.O(c()),this.O(c()),this,this.options)):s=i[e],s._$AI(h),e++;e<i.length&&(this._$AR(s&&s._$AB.nextSibling,e),i.length=e);}_$AR(t=this._$AA.nextSibling,s){for(this._$AP?.(false,true,s);t!==this._$AB;){const s=i$1(t).nextSibling;i$1(t).remove(),t=s;}}setConnected(t){ void 0===this._$AM&&(this._$Cv=t,this._$AP?.(t));}}class H{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(t,i,s,e,h){this.type=1,this._$AH=A,this._$AN=void 0,this.element=t,this.name=i,this._$AM=e,this.options=h,s.length>2||""!==s[0]||""!==s[1]?(this._$AH=Array(s.length-1).fill(new String),this.strings=s):this._$AH=A;}_$AI(t,i=this,s,e){const h=this.strings;let o=false;if(void 0===h)t=M(this,t,i,0),o=!a(t)||t!==this._$AH&&t!==E,o&&(this._$AH=t);else {const e=t;let n,r;for(t=h[0],n=0;n<h.length-1;n++)r=M(this,e[s+n],i,n),r===E&&(r=this._$AH[n]),o||=!a(r)||r!==this._$AH[n],r===A?t=A:t!==A&&(t+=(r??"")+h[n+1]),this._$AH[n]=r;}o&&!e&&this.j(t);}j(t){t===A?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,t??"");}}class I extends H{constructor(){super(...arguments),this.type=3;}j(t){this.element[this.name]=t===A?void 0:t;}}class L extends H{constructor(){super(...arguments),this.type=4;}j(t){this.element.toggleAttribute(this.name,!!t&&t!==A);}}class z extends H{constructor(t,i,s,e,h){super(t,i,s,e,h),this.type=5;}_$AI(t,i=this){if((t=M(this,t,i,0)??A)===E)return;const s=this._$AH,e=t===A&&s!==A||t.capture!==s.capture||t.once!==s.once||t.passive!==s.passive,h=t!==A&&(s===A||e);e&&this.element.removeEventListener(this.name,this,s),h&&this.element.addEventListener(this.name,this,t),this._$AH=t;}handleEvent(t){"function"==typeof this._$AH?this._$AH.call(this.options?.host??this.element,t):this._$AH.handleEvent(t);}}class Z{constructor(t,i,s){this.element=t,this.type=6,this._$AN=void 0,this._$AM=i,this.options=s;}get _$AU(){return this._$AM._$AU}_$AI(t){M(this,t);}}const B=t.litHtmlPolyfillSupport;B?.(S,k),(t.litHtmlVersions??=[]).push("3.3.2");const D=(t,i,s)=>{const e=s?.renderBefore??i;let h=e._$litPart$;if(void 0===h){const t=s?.renderBefore??null;e._$litPart$=h=new k(i.insertBefore(c(),t),t,void 0,s??{});}return h._$AI(t),h};

/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const s=globalThis;class i extends y$1{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0;}createRenderRoot(){const t=super.createRenderRoot();return this.renderOptions.renderBefore??=t.firstChild,t}update(t){const r=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(t),this._$Do=D(r,this.renderRoot,this.renderOptions);}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(true);}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(false);}render(){return E}}i._$litElement$=true,i["finalized"]=true,s.litElementHydrateSupport?.({LitElement:i});const o$1=s.litElementPolyfillSupport;o$1?.({LitElement:i});(s.litElementVersions??=[]).push("4.2.2");

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

const CARD_PROTOCOL_VERSION = 1;
const DEFAULT_MAX_ROWS = 8;
class HaInsightsCard extends i {
    constructor() {
        super(...arguments);
        this._config = { type: "custom:ha-insights-card" };
        this._insights = [];
        this._loading = true;
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
        this._wired = false;
        this._keydownHandler = (e) => {
            if (e.key === "Escape" && this._dialogId) {
                this._closeDialog();
            }
        };
        this._refreshFromEvent = async () => {
            if (!this.hass)
                return;
            try {
                const result = await this.hass.connection.sendMessagePromise({
                    type: "home_insights/list",
                    include_applied: Boolean(this._config.include_applied),
                });
                this._insights = result.insights ?? [];
            }
            catch (err) {
                console.warn("ha-insights-card refresh-from-event failed", err);
            }
        };
    }
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
        // Listen for explicit refresh requests from the parent panel (panel
        // dispatches this after its own Scan / Purge / Backfill buttons so
        // the card pulls a fresh ws_list — guarantees the deduped view
        // reaches the UI even when subscribe-stream events alone wouldn't).
        window.addEventListener("ha-insights-refresh", this._refreshFromEvent);
        this._resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                this._updateAutoMaxRows(entry.contentRect.height);
            }
        });
        this._resizeObserver.observe(this);
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
        if (changedProps.has("hass") && this.hass && !this._wired) {
            this._wired = true;
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
        window.removeEventListener("ha-insights-refresh", this._refreshFromEvent);
        document.body.style.overflow = "";
        this._unsub?.();
        this._unsub = undefined;
        this._wired = false;
        this._resizeObserver?.disconnect();
        this._resizeObserver = undefined;
    }
    async _wire() {
        if (!this.hass)
            return;
        try {
            this._hello = await this.hass.connection.sendMessagePromise({
                type: "home_insights/hello",
                card_version: "0.8.2",
            });
        }
        catch (err) {
            this._error = `Integration not reachable: ${this._asMessage(err)}`;
            this._loading = false;
            return;
        }
        try {
            const result = await this.hass.connection.sendMessagePromise({
                type: "home_insights/list",
                include_applied: Boolean(this._config.include_applied),
            });
            this._insights = result.insights ?? [];
        }
        catch (err) {
            this._error = `Could not list insights: ${this._asMessage(err)}`;
            this._loading = false;
            return;
        }
        try {
            this._unsub = await this.hass.connection.subscribeMessage((event) => this._handleEvent(event), { type: "home_insights/subscribe" });
        }
        catch (err) {
            console.warn("ha-insights-card subscribe failed", err);
        }
        this._loading = false;
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
    _renderPayloadView(insight, basePayload) {
        const editing = this._editingPayloadFor.has(insight.id);
        const draft = this._payloadEditsById.get(insight.id);
        const parseError = this._payloadParseErrorById.get(insight.id);
        const view = basePayload ?? insight.payload;
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
            (i.integration != null && integSet.has(i.integration)));
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
          ${insight.title}
          ${hasCohort
            ? b ` <button
                class="pill-action"
                style="margin-left:6px;"
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
            >${members.map((m) => b `<span class="cohort-member-chip">${m}</span>`)}</div>`
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
            <div class="dialog-title">${insight.title}</div>
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
                  <h4>Automation that would be created</h4>
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
                    ${llmEnabled
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
                    <button
                      class="action"
                      ?disabled=${this._testBusy}
                      title="Fire the action(s) for real"
                      @click=${() => this._testActions(insight)}
                    >
                      ${this._testBusy ? "testing…" : "🔥 Test actions"}
                    </button>
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
                : b `<button
                        class="action primary"
                        ?disabled=${busy}
                        @click=${() => this._apply(insight)}
                      >
                        ${busy ? "applying…" : "Apply"}
                      </button>`}
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
        if (this._loading) {
            return b `
        <ha-card>
          ${this._renderHeader()}
          <div class="empty">Loading…</div>
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
      </ha-card>
      ${this._renderDialog()}
      ${this._renderRefineAutomationModal()}
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
], HaInsightsCard.prototype, "_loading", void 0);
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

class HaInsightsPanel extends i {
    constructor() {
        super(...arguments);
        this.narrow = false;
        this._search = "";
        this._minConfidence = 0;
        this._sortBy = "confidence";
        this._groupBy = "none";
        this._backfillBusy = false;
        this._bulkBusy = false;
        this._scanBusy = false;
        this._rollupBusy = false;
        this._rollupProgress = null;
        this._rollupPollTimer = null;
        this._recorderStatus = null;
        // v1.1 panel filters — chip-style multi-select. Empty array = no filter.
        // Persisted alongside search/confidence/sort in localStorage.
        this._filterDomains = [];
        this._filterAreas = [];
        this._filterDeviceClasses = [];
        this._filterDetectors = [];
        // v1.2 Phase 5: floor + integration axes alongside domain/area/dc/detector.
        this._filterFloors = [];
        this._filterIntegrations = [];
        // v1.2.1: depth of LLM reasoning for 🤖 Suggest. "concise" is the
        // cheap default (~150 token rules); "indepth" sends a fuller
        // protocol (~600 token rules) for tricky cases. Persists across
        // page loads. Passed through the embedded card config.
        this._auditDepth = "concise";
        // Total insight count BEFORE chip filters. The card returns the
        // post-filter count via a property; we maintain the pre-filter count
        // here for the "Showing X of Y" hint in the panel header.
        this._totalInsightCount = 0;
        this._visibleInsightCount = 0;
        // Snapshot of distinct values present in the loaded insight set.
        // Drives the chip dropdown options. Refreshed on every list reload.
        this._availableDomains = [];
        this._availableAreas = [];
        this._availableDeviceClasses = [];
        this._availableDetectors = [];
        // v1.2 Phase 5
        this._availableFloors = [];
        this._availableIntegrations = [];
        // Area-id ↔ display-name maps populated from the loaded insight set
        // so chip dropdowns and the per-detector header show friendly labels
        // ("Living Room") instead of opaque registry ids.
        this._areaNameById = {};
        this._floorNameById = {};
        // Per-detector counts displayed as small chips in the header.
        // Populated from the SAME insight set as the filter chip dropdowns.
        this._detectorCounts = {};
        this._toast = "";
        this._auditOpen = false;
        this._auditLog = [];
        this._auditBusy = false;
        this._onInsightsLoaded = (e) => {
            const detail = e.detail;
            const insights = detail?.insights ?? [];
            this._totalInsightCount = insights.length;
            // Distinct values populate chip dropdowns. Sorted for stable UI.
            this._availableDomains = [
                ...new Set(insights.map((i) => i.domain).filter((v) => !!v)),
            ].sort();
            this._availableAreas = [
                ...new Set(insights.map((i) => i.area_id).filter((v) => !!v)),
            ].sort();
            this._availableDeviceClasses = [
                ...new Set(insights.map((i) => i.device_class).filter((v) => !!v)),
            ].sort();
            this._availableDetectors = [
                ...new Set(insights.map((i) => i.detector).filter((v) => !!v)),
            ].sort();
            this._availableFloors = [
                ...new Set(insights.map((i) => i.floor_id).filter((v) => !!v)),
            ].sort();
            this._availableIntegrations = [
                ...new Set(insights.map((i) => i.integration).filter((v) => !!v)),
            ].sort();
            // Build id → friendly-name lookups from the loaded list. The card
            // already carries area_name + floor_name on each row when set;
            // collecting them here keeps chip labels readable.
            const areaNames = {};
            const floorNames = {};
            for (const i of insights) {
                if (typeof i.area_id === "string" && typeof i.area_name === "string") {
                    areaNames[i.area_id] = i.area_name;
                }
                if (typeof i.floor_id === "string" && typeof i.floor_name === "string") {
                    floorNames[i.floor_id] = i.floor_name;
                }
            }
            this._areaNameById = areaNames;
            this._floorNameById = floorNames;
            // Per-detector counts for the header chip strip.
            const counts = {};
            for (const i of insights) {
                const d = i.detector;
                if (typeof d === "string")
                    counts[d] = (counts[d] ?? 0) + 1;
            }
            this._detectorCounts = counts;
            // Compute visible count by re-applying the same filter the card uses
            // (search + min_confidence + chip filters). Cheap; same N as card.
            const search = this._search.trim().toLowerCase();
            const dom = new Set(this._filterDomains);
            const area = new Set(this._filterAreas);
            const dc = new Set(this._filterDeviceClasses);
            const det = new Set(this._filterDetectors);
            const floor = new Set(this._filterFloors);
            const integ = new Set(this._filterIntegrations);
            this._visibleInsightCount = insights.filter((i) => {
                const conf = i.confidence ?? 0;
                if (conf < this._minConfidence)
                    return false;
                const title = (i.title ?? "").toLowerCase();
                if (search && !title.includes(search))
                    return false;
                if (dom.size > 0 && !(typeof i.domain === "string" && dom.has(i.domain)))
                    return false;
                if (area.size > 0 && !(typeof i.area_id === "string" && area.has(i.area_id)))
                    return false;
                if (dc.size > 0 && !(typeof i.device_class === "string" && dc.has(i.device_class)))
                    return false;
                if (det.size > 0 && !(typeof i.detector === "string" && det.has(i.detector)))
                    return false;
                if (floor.size > 0 && !(typeof i.floor_id === "string" && floor.has(i.floor_id)))
                    return false;
                if (integ.size > 0 &&
                    !(typeof i.integration === "string" && integ.has(i.integration))) {
                    return false;
                }
                return true;
            }).length;
        };
        this._rollupLoopAborted = false;
        this._rollupLoopStartTs = 0;
    }
    // Persistent filter storage (v0.8 phase 6). Versioned key so future
    // shape changes can ignore old saved state cleanly.
    static { this._STORAGE_KEY = "ha-insights-panel-filters-v1"; }
    static { this.styles = i$3 `
    :host {
      display: block;
      box-sizing: border-box;
      min-height: 100vh;
      background: var(--primary-background-color, #f6f7f9);
      color: var(--primary-text-color);
    }
    .header {
      padding: 18px 24px 12px;
      background: var(--app-header-background-color, var(--card-background-color, white));
      border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.08));
      position: sticky;
      top: 0;
      z-index: 4;
      display: flex;
      align-items: flex-start;
      gap: 16px;
    }
    .header .titles {
      flex: 1;
    }
    .header h1 {
      margin: 0 0 4px;
      font-size: 1.6em;
      font-weight: 500;
    }
    .header .sub {
      font-size: 0.9em;
      color: var(--secondary-text-color);
    }
    .header .actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
    }
    .header button.action {
      background: none;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.18));
      padding: 8px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9em;
      color: var(--primary-text-color);
    }
    .header button.action:hover:not(:disabled) {
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
    }
    .header button.action:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .toast {
      position: fixed;
      top: 16px;
      right: 16px;
      background: var(--success-color, #4caf50);
      color: white;
      padding: 10px 14px;
      border-radius: 6px;
      font-size: 0.9em;
      z-index: 10;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }
    .filters {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      padding: 12px 24px;
      background: var(--card-background-color, white);
      border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.08));
      align-items: center;
    }
    .filters input[type="search"] {
      flex: 1 1 280px;
      padding: 8px 12px;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.18));
      border-radius: 6px;
      font: inherit;
      background: var(--card-background-color, white);
      color: var(--primary-text-color);
    }
    .filters input[type="search"]:focus {
      outline: none;
      border-color: var(--primary-color);
    }
    .filters .conf {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9em;
      color: var(--secondary-text-color);
    }
    .filters input[type="range"] {
      width: 140px;
    }
    .filters select {
      padding: 6px 10px;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.18));
      border-radius: 6px;
      font: inherit;
      background: var(--card-background-color, white);
      color: var(--primary-text-color);
    }
    .filters select:focus {
      outline: none;
      border-color: var(--primary-color);
    }
    .body {
      padding: 16px 24px 32px;
      max-width: 1100px;
      margin: 0 auto;
    }

    /* Audit log section */
    .audit {
      max-width: 1100px;
      margin: 8px auto 32px;
      padding: 12px 24px 16px;
      background: var(--card-background-color, white);
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.08));
      border-radius: 8px;
    }
    .audit-toggle {
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      user-select: none;
    }
    .audit-toggle h3 {
      margin: 0;
      font-size: 1em;
      font-weight: 500;
    }
    .audit-toggle .arrow {
      transition: transform 200ms;
    }
    .audit-toggle.open .arrow {
      transform: rotate(90deg);
    }
    .audit-empty {
      color: var(--secondary-text-color);
      font-size: 0.9em;
      padding: 12px 0 0;
    }
    .audit-list {
      list-style: none;
      padding: 0;
      margin: 12px 0 0;
      max-height: 400px;
      overflow-y: auto;
    }
    .audit-list li {
      padding: 8px 0;
      border-bottom: 1px solid var(--divider-color, rgba(0, 0, 0, 0.06));
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 12px;
      align-items: center;
      font-size: 0.88em;
    }
    .audit-list li:last-child {
      border-bottom: none;
    }
    .audit-icon {
      width: 1em;
      text-align: center;
    }
    .audit-icon-ok { color: var(--success-color, #2e7d32); }
    .audit-icon-fail { color: var(--error-color, #c62828); }
    .audit-meta {
      color: var(--secondary-text-color);
      font-size: 0.8em;
      margin-top: 2px;
    }
    .audit-bytes {
      font-family: var(--code-font-family, monospace);
      color: var(--secondary-text-color);
      white-space: nowrap;
      font-size: 0.8em;
    }
    .detector-counts {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 8px;
    }
    .detector-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      border-radius: 999px;
      border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.18));
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
      color: var(--primary-text-color);
      font-size: 0.78em;
      cursor: pointer;
      font-family: inherit;
    }
    .detector-chip:hover {
      background: var(--divider-color, rgba(0, 0, 0, 0.08));
    }
    .detector-chip.is-active {
      background: var(--primary-color);
      color: var(--text-primary-color, white);
      border-color: var(--primary-color);
    }
    .detector-chip-count {
      background: rgba(0, 0, 0, 0.12);
      padding: 0 6px;
      border-radius: 999px;
      font-weight: 600;
      font-size: 0.85em;
    }
    .detector-chip.is-active .detector-chip-count {
      background: rgba(255, 255, 255, 0.25);
    }
    .rollup-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 8px 16px;
      border-top: 1px solid var(--divider-color, rgba(0, 0, 0, 0.1));
      background: var(--secondary-background-color, rgba(0, 0, 0, 0.03));
      font-size: 0.85em;
    }
    .rollup-bar-wrap {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
    }
    .rollup-bar {
      flex: 1 1 200px;
      min-width: 160px;
      height: 8px;
      background: var(--divider-color, rgba(0, 0, 0, 0.12));
      border-radius: 999px;
      overflow: hidden;
    }
    .rollup-bar-fill {
      height: 100%;
      transition: width 300ms ease-out;
      background: var(--primary-color);
    }
    .rollup-bar-fill.is-running {
      background: linear-gradient(
        90deg,
        var(--primary-color) 0%,
        var(--primary-color) 50%,
        rgba(255, 255, 255, 0.4) 100%
      );
      background-size: 200% 100%;
      animation: rollup-shimmer 1.6s linear infinite;
    }
    .rollup-bar-fill.is-done {
      background: var(--success-color, #4caf50);
    }
    @keyframes rollup-shimmer {
      from {
        background-position: 100% 0;
      }
      to {
        background-position: -100% 0;
      }
    }
    .rollup-stat {
      color: var(--secondary-text-color);
      white-space: nowrap;
    }
    .rollup-stat-done {
      color: var(--success-color, #4caf50);
    }
    .rollup-stat code {
      background: var(--divider-color, rgba(0, 0, 0, 0.08));
      padding: 1px 6px;
      border-radius: 4px;
      font-family: var(--code-font-family, "Roboto Mono", monospace);
      font-size: 0.9em;
    }
    .rollup-hint {
      color: var(--secondary-text-color);
      font-size: 0.9em;
    }
    .rollup-hint strong {
      color: var(--primary-text-color);
    }
    .rollup-hint-warn {
      color: var(--warning-color, #ff9800);
    }
    .rollup-hint-warn strong {
      color: var(--warning-color, #ff9800);
    }
    .rollup-hint-tip {
      margin-top: 4px;
      padding: 6px 8px;
      background: rgba(255, 152, 0, 0.08);
      border-left: 3px solid var(--warning-color, #ff9800);
      border-radius: 4px;
      font-size: 0.95em;
    }
    .rollup-hint-tip code {
      background: rgba(0, 0, 0, 0.08);
      padding: 1px 5px;
      border-radius: 3px;
      font-family: var(--code-font-family, "Roboto Mono", monospace);
    }
    @media (max-width: 600px) {
      .header,
      .filters,
      .body {
        padding-left: 12px;
        padding-right: 12px;
      }
    }
  `; }
    connectedCallback() {
        super.connectedCallback();
        this._loadFilters();
        // Bubble-listen for the embedded card's "insights-loaded" event so we
        // can refresh chip-filter options and the "Showing X of Y" counters
        // without owning the WS list call ourselves.
        this.addEventListener("insights-loaded", this._onInsightsLoaded);
        // One-shot recorder status read so the rollup section can show
        // the user's real available window without polling.
        void this._fetchRecorderStatus();
        // Cold-poll once in case a rollup is already running when the
        // panel mounts (e.g. user navigated away mid-batch and came back).
        void this._pollRollupProgress();
    }
    disconnectedCallback() {
        super.disconnectedCallback();
        this.removeEventListener("insights-loaded", this._onInsightsLoaded);
        this._stopRollupPoll();
    }
    updated() {
        // Save on any filter change. Cheap (<1 KB stringify) and synchronous.
        this._saveFilters();
    }
    _loadFilters() {
        try {
            const raw = window.localStorage.getItem(HaInsightsPanel._STORAGE_KEY);
            if (!raw)
                return;
            const saved = JSON.parse(raw);
            if (typeof saved.search === "string")
                this._search = saved.search;
            if (typeof saved.minConfidence === "number") {
                this._minConfidence = saved.minConfidence;
            }
            if (saved.sortBy === "confidence" || saved.sortBy === "age" || saved.sortBy === "detector") {
                this._sortBy = saved.sortBy;
            }
            if (saved.groupBy === "none" ||
                saved.groupBy === "detector" ||
                saved.groupBy === "area" ||
                saved.groupBy === "floor" ||
                saved.groupBy === "integration") {
                this._groupBy = saved.groupBy;
            }
            if (typeof saved.auditOpen === "boolean")
                this._auditOpen = saved.auditOpen;
            if (Array.isArray(saved.filterDomains)) {
                this._filterDomains = saved.filterDomains.filter((s) => typeof s === "string");
            }
            if (Array.isArray(saved.filterAreas)) {
                this._filterAreas = saved.filterAreas.filter((s) => typeof s === "string");
            }
            if (Array.isArray(saved.filterDeviceClasses)) {
                this._filterDeviceClasses = saved.filterDeviceClasses.filter((s) => typeof s === "string");
            }
            if (Array.isArray(saved.filterDetectors)) {
                this._filterDetectors = saved.filterDetectors.filter((s) => typeof s === "string");
            }
            if (Array.isArray(saved.filterFloors)) {
                this._filterFloors = saved.filterFloors.filter((s) => typeof s === "string");
            }
            if (Array.isArray(saved.filterIntegrations)) {
                this._filterIntegrations = saved.filterIntegrations.filter((s) => typeof s === "string");
            }
            if (saved.auditDepth === "concise" || saved.auditDepth === "indepth") {
                this._auditDepth = saved.auditDepth;
            }
        }
        catch {
            // Corrupted localStorage entry; fall back to defaults.
        }
    }
    _saveFilters() {
        try {
            window.localStorage.setItem(HaInsightsPanel._STORAGE_KEY, JSON.stringify({
                search: this._search,
                minConfidence: this._minConfidence,
                sortBy: this._sortBy,
                groupBy: this._groupBy,
                auditOpen: this._auditOpen,
                filterDomains: this._filterDomains,
                filterAreas: this._filterAreas,
                filterDeviceClasses: this._filterDeviceClasses,
                filterDetectors: this._filterDetectors,
                filterFloors: this._filterFloors,
                filterIntegrations: this._filterIntegrations,
                auditDepth: this._auditDepth,
            }));
        }
        catch {
            // Quota / private mode; non-fatal
        }
    }
    _onSearch(e) {
        this._search = e.target.value;
    }
    _onConfidence(e) {
        const value = Number(e.target.value);
        this._minConfidence = Number.isFinite(value) ? value : 0;
    }
    get _embeddedCardConfig() {
        const key = `${this._search}|${this._minConfidence}|${this._sortBy}|${this._groupBy}|` +
            `${this._filterDomains.join(",")}|${this._filterAreas.join(",")}|` +
            `${this._filterDeviceClasses.join(",")}|${this._filterDetectors.join(",")}|` +
            `${this._filterFloors.join(",")}|${this._filterIntegrations.join(",")}|` +
            `${this._auditDepth}`;
        if (this._cachedCardConfigKey !== key) {
            this._cachedCardConfigKey = key;
            this._cachedCardConfig = {
                type: "custom:ha-insights-card",
                title: this._search ? `Insights matching "${this._search}"` : "All insights",
                // Cap at 200 rows even on the panel. With 1000+ insights the
                // browser locks up rendering all of them; if a user really has
                // 1000+ they should use search/filter to narrow first. The card
                // shows a "showing N of M" hint when the list is truncated.
                max_rows: 200,
                min_confidence: this._minConfidence,
                search: this._search,
                sort_by: this._sortBy,
                group_by: this._groupBy,
                domain_filter: this._filterDomains,
                area_filter: this._filterAreas,
                device_class_filter: this._filterDeviceClasses,
                detector_filter: this._filterDetectors,
                floor_filter: this._filterFloors,
                integration_filter: this._filterIntegrations,
                audit_depth: this._auditDepth,
            };
        }
        return this._cachedCardConfig;
    }
    async _runAuditRollup() {
        if (!this.hass || this._rollupBusy)
            return;
        this._rollupBusy = true;
        this._rollupLoopAborted = false;
        this._rollupLoopStartTs = Date.now();
        try {
            // v1.2 loop-mode: single click chains batches until all
            // entities are caught up OR a 5-minute ceiling. Each batch
            // is bounded by the backend's 120s budget + single-flight
            // lock, so we're not bypassing safety — just removing the
            // "click 12 times" UX cliff. User can stop via the Stop
            // button which sets _rollupLoopAborted.
            this.hass.connection
                .sendMessagePromise({
                type: "call_service",
                domain: "ha_insights",
                service: "run_audit_rollup",
                service_data: {},
            })
                .catch((err) => {
                this._showToast(`Rollup failed to start: ${err.message ?? String(err)}`);
            });
            // Kick the poll right away so the bar shows before the first
            // 2-second interval fires.
            await this._pollRollupProgress();
            this._startRollupPoll();
        }
        finally {
            // _rollupBusy stays sticky until the polled `running` flag
            // turns false in _pollRollupProgress.
        }
    }
    /** Hard ceiling on the auto-chain so a runaway backend can't
     *  loop forever. 5 minutes covers ≥ 1000 entities at typical
     *  rates while bounding worst-case user wait. */
    static { this._ROLLUP_LOOP_CEILING_MS = 5 * 60 * 1000; }
    _stopRollupLoop() {
        this._rollupLoopAborted = true;
    }
    _startRollupPoll() {
        if (this._rollupPollTimer !== null)
            return;
        this._rollupPollTimer = window.setInterval(() => void this._pollRollupProgress(), 2000);
    }
    _stopRollupPoll() {
        if (this._rollupPollTimer !== null) {
            window.clearInterval(this._rollupPollTimer);
            this._rollupPollTimer = null;
        }
    }
    async _pollRollupProgress() {
        if (!this.hass)
            return;
        try {
            const snap = (await this.hass.connection.sendMessagePromise({
                type: "home_insights/rollup_progress",
            }));
            this._rollupProgress = snap;
            if (!snap.running) {
                this._rollupBusy = false;
                this._stopRollupPoll();
                if (snap.last_summary && snap.finished_ts) {
                    const s = snap.last_summary;
                    const processed = s.entities_processed ?? 0;
                    const remaining = s.next_due_count ?? 0;
                    const timedOut = (s.timed_out_entities ?? []).length;
                    const elapsedMs = Date.now() - this._rollupLoopStartTs;
                    const underCeiling = elapsedMs < HaInsightsPanel._ROLLUP_LOOP_CEILING_MS;
                    // Loop-mode: if there's still work AND user hasn't
                    // stopped AND we're under the 5-min ceiling, chain
                    // another batch. Otherwise emit the final toast.
                    const shouldChain = remaining > 0 &&
                        processed > 0 && // forward progress is happening
                        !this._rollupLoopAborted &&
                        !s.skipped_inflight &&
                        underCeiling;
                    if (shouldChain) {
                        // Restart the next batch + keep polling. Brief courtesy
                        // pause lets the recorder breathe between batches.
                        window.setTimeout(() => {
                            if (!this.hass || this._rollupLoopAborted)
                                return;
                            this._rollupBusy = true;
                            this.hass.connection
                                .sendMessagePromise({
                                type: "call_service",
                                domain: "ha_insights",
                                service: "run_audit_rollup",
                                service_data: {},
                            })
                                .catch((err) => {
                                this._showToast(`Rollup chain failed: ${err.message ?? String(err)}`);
                                this._rollupBusy = false;
                            });
                            void this._pollRollupProgress();
                            this._startRollupPoll();
                        }, 1500);
                        return; // don't show terminal toast yet
                    }
                    let message;
                    if (s.skipped_inflight) {
                        message = "Rollup already running — try again in a moment";
                    }
                    else if (processed === 0 && remaining === 0 && timedOut === 0) {
                        message = "All audit rollups are already up to date ✓";
                    }
                    else if (processed === 0 && timedOut > 0) {
                        message = `No progress — ${timedOut} entities timed out, will retry`;
                    }
                    else if (remaining === 0) {
                        message = `Rollup complete: ${processed} entities caught up · all up to date ✓`;
                    }
                    else if (this._rollupLoopAborted) {
                        message = `Rollup stopped: ${remaining} entities still queued`;
                    }
                    else if (!underCeiling) {
                        message = `Rollup hit 5-min ceiling: ${remaining} entities still queued — click again to continue`;
                    }
                    else {
                        message = `Rollup batch: ${processed} advanced · ${remaining} still need work`;
                    }
                    if (s.batch_duration_sec) {
                        message += ` (${s.batch_duration_sec}s)`;
                    }
                    this._showToast(message);
                }
            }
        }
        catch (err) {
            // Endpoint not registered yet (e.g. backend not deployed) — give
            // up quietly. Without this guard the poll would spam errors
            // every 2s on older installs.
            this._stopRollupPoll();
            this._rollupBusy = false;
        }
    }
    async _fetchRecorderStatus() {
        if (!this.hass)
            return;
        try {
            this._recorderStatus = (await this.hass.connection.sendMessagePromise({
                type: "home_insights/recorder_status",
            }));
        }
        catch {
            // Endpoint may not exist on older backends — leave null.
        }
    }
    async _runBackfill() {
        if (!this.hass)
            return;
        this._backfillBusy = true;
        try {
            await this.hass.connection.sendMessagePromise({
                type: "call_service",
                domain: "ha_insights",
                service: "backfill",
                service_data: {},
            });
            // Poll once to get summary
            const status = (await this.hass.connection.sendMessagePromise({
                type: "home_insights/backfill_status",
            }));
            if (status.last) {
                this._showToast(`Backfilled ${status.last.events_added} events from ${status.last.entities_seen} entities (${status.last.lookback_days}d)`);
            }
            else {
                this._showToast("Backfill complete");
            }
            // Trigger a re-scan so detectors run against the new buffer contents
            await this.hass.connection.sendMessagePromise({
                type: "call_service",
                domain: "ha_insights",
                service: "scan_now",
                service_data: {},
            });
            // Force a card re-fetch so the deduped post-scan view reaches
            // the UI instead of accumulating raw subscribe-stream rows.
            window.dispatchEvent(new CustomEvent("ha-insights-refresh"));
        }
        catch (err) {
            this._showToast(`Backfill failed: ${err.message ?? String(err)}`);
        }
        finally {
            this._backfillBusy = false;
        }
    }
    async _runScanNow() {
        if (!this.hass || this._scanBusy)
            return;
        // Use the home_insights/scan_now WS endpoint instead of call_service —
        // it awaits the actual scan completion + returns a count, giving us
        // real "scan finished" feedback. call_service was returning the moment
        // the call was queued, so the user got "Scan complete" instantly while
        // the scan was still running, with no in-progress feedback.
        this._scanBusy = true;
        this._showToast("Scanning…");
        try {
            const result = await this.hass.connection.sendMessagePromise({ type: "home_insights/scan_now" });
            const noun = result.insights_emitted === 1 ? "insight" : "insights";
            const verb = result.canceled ? "canceled" : "complete";
            const parts = [
                `Scan ${verb}: ${result.insights_emitted} new ${noun} from ${result.detectors_run.length} detectors`,
            ];
            if (result.swept_stale) {
                parts.push(`${result.swept_stale} stale removed`);
            }
            if (result.suppressed_as_duplicate) {
                parts.push(`${result.suppressed_as_duplicate} dup-of-existing-automation suppressed`);
            }
            this._showToast(parts.join(" · "));
            // Tell the embedded card to re-fetch insights via ws_list. Without
            // this, the card's subscribe stream may have accumulated stale
            // pre-dedup rows from the in-progress scan; ws_list returns the
            // canonical deduped view.
            window.dispatchEvent(new CustomEvent("ha-insights-refresh"));
        }
        catch (err) {
            this._showToast(`Scan failed: ${err.message ?? String(err)}`);
        }
        finally {
            this._scanBusy = false;
        }
    }
    async _cancelScan() {
        if (!this.hass || !this._scanBusy)
            return;
        try {
            await this.hass.connection.sendMessagePromise({
                type: "home_insights/cancel_scan",
            });
            this._showToast("Stopping scan…");
        }
        catch (err) {
            this._showToast(`Cancel failed: ${err.message ?? String(err)}`);
        }
    }
    /** Force the browser to pick up a freshly-deployed panel/card bundle.
     *  Two-step: (1) ask the integration to re-register the panel with a
     *  fresh ?v= mtime/size signature so the URL changes; (2) hard-reload
     *  the window so the browser bypasses its HTTP cache + service worker.
     *  Without (1), the URL stays the same and the browser SW keeps the
     *  old bundle. Without (2), the new ?v= is queued but the current tab
     *  is still running old code. Both pieces matter. */
    async _reloadUi() {
        if (!this.hass)
            return;
        try {
            await this.hass.connection.sendMessagePromise({
                type: "call_service",
                domain: "ha_insights",
                service: "reload_ui",
                service_data: {},
            });
            this._showToast("Reloading bundle…");
            // Give the toast a tick to paint, then force a cache-bypassing
            // reload. `location.reload(true)` is deprecated; the modern path
            // is `location.reload()` after navigating to a query-busted URL.
            window.setTimeout(() => {
                const url = new URL(window.location.href);
                url.searchParams.set("_reload", String(Date.now()));
                window.location.replace(url.toString());
            }, 200);
        }
        catch (err) {
            this._showToast(`Reload failed: ${err.message ?? String(err)}`);
        }
    }
    async _purgeAllInsights() {
        if (!this.hass)
            return;
        const confirmed = window.confirm("Delete ALL stored insights from this integration?\n\n" +
            "This wipes the insights table + outbound LLM call audit log. " +
            "Applied-automation history and pseudonym map are preserved. " +
            "Useful when a noisy scan filled the panel with thousands of " +
            "spurious insights — clean slate, click Run Scan Now again.");
        if (!confirmed)
            return;
        try {
            await this.hass.connection.sendMessagePromise({
                type: "call_service",
                domain: "ha_insights",
                service: "purge_observations",
                service_data: {},
            });
            this._showToast("Purged all insights");
            window.dispatchEvent(new CustomEvent("ha-insights-refresh"));
        }
        catch (err) {
            this._showToast(`Purge failed: ${err.message ?? String(err)}`);
        }
    }
    /** Bulk-apply all currently-visible insights (after the panel's filters
     *  have been applied). Confirms first because each apply writes a real
     *  automation. Best for power users triaging a backlog after a long
     *  detection run; not exposed on the dashboard card. */
    async _runBulkApply() {
        if (!this.hass)
            return;
        // Pull the same filtered list the embedded card is rendering. We query
        // the WS API directly so the panel doesn't have to peek into the
        // card's internals.
        let visible = [];
        try {
            const result = await this.hass.connection.sendMessagePromise({ type: "home_insights/list" });
            const search = this._search.trim().toLowerCase();
            visible = result.insights
                .filter((i) => i.confidence >= this._minConfidence)
                .filter((i) => !search || i.title.toLowerCase().includes(search))
                .filter((i) => i.payload_format === "automation");
        }
        catch (err) {
            this._showToast(`Could not list: ${err.message ?? String(err)}`);
            return;
        }
        if (visible.length === 0) {
            this._showToast("Nothing to apply (no automation insights match)");
            return;
        }
        const proceed = window.confirm(`Apply ${visible.length} insight${visible.length === 1 ? "" : "s"}? `
            + "Each will write a real Home Assistant automation. "
            + "Refined / renamed / edited drafts on individual insights are NOT used "
            + "by bulk apply — only the original detected payload.");
        if (!proceed)
            return;
        this._bulkBusy = true;
        let succeeded = 0;
        const errors = [];
        try {
            for (const insight of visible) {
                try {
                    await this.hass.connection.sendMessagePromise({
                        type: "home_insights/apply",
                        insight_id: insight.id,
                    });
                    succeeded += 1;
                }
                catch (err) {
                    const message = err.message ?? String(err);
                    errors.push(`${insight.title}: ${message}`);
                }
            }
        }
        finally {
            this._bulkBusy = false;
        }
        if (errors.length === 0) {
            this._showToast(`Applied all ${succeeded}`);
        }
        else {
            this._showToast(`Applied ${succeeded} / ${visible.length}; ${errors.length} error(s) — first: ${errors[0]}`);
        }
    }
    _showToast(message) {
        this._toast = message;
        window.clearTimeout(this._toastTimer);
        this._toastTimer = window.setTimeout(() => {
            this._toast = "";
        }, 3500);
    }
    async _toggleAudit() {
        if (this._auditOpen) {
            this._auditOpen = false;
            return;
        }
        this._auditOpen = true;
        if (this._auditLog.length === 0) {
            await this._loadAuditLog();
        }
    }
    async _loadAuditLog() {
        if (!this.hass)
            return;
        this._auditBusy = true;
        try {
            const result = await this.hass.connection.sendMessagePromise({ type: "home_insights/audit_log", limit: 25 });
            this._auditLog = result.calls;
        }
        catch (err) {
            this._showToast(`Audit log failed: ${err.message ?? String(err)}`);
        }
        finally {
            this._auditBusy = false;
        }
    }
    _renderAuditLog() {
        return b `
      <div class="audit">
        <div
          class="audit-toggle ${this._auditOpen ? "open" : ""}"
          @click=${this._toggleAudit}
        >
          <h3>🛡️ LLM activity (${this._auditLog.length || "—"})</h3>
          <span class="arrow">▶</span>
        </div>
        ${this._auditOpen
            ? this._auditBusy
                ? b `<div class="audit-empty">Loading…</div>`
                : this._auditLog.length === 0
                    ? b `<div class="audit-empty">
                  No LLM calls recorded yet. When you click Explain or
                  Refine on an insight, each call lands here.
                </div>`
                    : b `
                  <ul class="audit-list">
                    ${this._auditLog.map((c) => this._renderAuditRow(c))}
                  </ul>
                `
            : ""}
      </div>
    `;
    }
    _renderAuditRow(c) {
        const when = new Date(c.timestamp);
        const local = when.toLocaleString();
        const success = c.success === true;
        const fail = c.success === false;
        const icon = success ? "✓" : fail ? "✗" : "·";
        const iconCls = success
            ? "audit-icon-ok"
            : fail
                ? "audit-icon-fail"
                : "";
        const title = c.insight_title ?? (c.insight_id ? `[deleted ${c.insight_id.slice(0, 8)}]` : "(unknown insight)");
        return b `
      <li>
        <span class="audit-icon ${iconCls}">${icon}</span>
        <div>
          <div>${title}</div>
          <div class="audit-meta">
            ${local} · ${c.agent} · ${c.redaction_mode}
          </div>
        </div>
        <div class="audit-bytes">
          ↑${c.bytes_sent}b / ↓${c.bytes_received}b
        </div>
      </li>
    `;
    }
    render() {
        return b `
      <div class="header">
        <div class="titles">
          <h1>HA Insights</h1>
          <div class="sub">
            Patterns the integration noticed in your home — apply, refine, test, or dismiss each.
          </div>
          ${this._renderDetectorCounts()}
        </div>
        <div class="actions">
          <button
            class="action"
            ?disabled=${this._backfillBusy}
            title="Re-populate the buffer from HA's recorder"
            @click=${this._runBackfill}
          >
            ${this._backfillBusy ? "Backfilling…" : "🔄 Backfill"}
          </button>
          <button
            class="action"
            ?disabled=${this._rollupBusy}
            title="Recompute long-term audit rollups (day-of-week / month-of-year buckets) from HA's recorder. Single click chains batches until everything is caught up OR 5-minute ceiling — Stop button interrupts."
            @click=${this._runAuditRollup}
          >
            ${this._rollupBusy ? "Rolling up…" : "📅 Run audit rollup"}
          </button>
          ${this._rollupBusy
            ? b `<button
                class="action"
                title="Stop chaining batches. The current batch finishes; no new batch is started."
                @click=${this._stopRollupLoop}
              >
                ⏹ Stop rollup
              </button>`
            : ""}
          <button
            class="action"
            ?disabled=${this._scanBusy}
            title="Run all detectors against the current buffer"
            @click=${this._runScanNow}
          >
            ${this._scanBusy ? "Scanning…" : "🔍 Scan now"}
          </button>
          ${this._scanBusy
            ? b `<button
                class="action"
                title="Stop the in-flight scan after the current detector"
                @click=${this._cancelScan}
              >
                ⏹ Stop
              </button>`
            : ""}
          <button
            class="action"
            title="Re-register the panel with a fresh cache-bust + force browser reload — use after deploying a new ha-insights-card.js / panel.js"
            @click=${this._reloadUi}
          >
            🔄 Reload UI
          </button>
          <button
            class="action"
            title="Delete every stored insight (useful when a noisy scan filled the list)"
            @click=${this._purgeAllInsights}
          >
            🗑 Purge all
          </button>
          <button
            class="action"
            ?disabled=${this._bulkBusy}
            title="Apply every visible automation insight (respects search + confidence filters)"
            @click=${this._runBulkApply}
          >
            ${this._bulkBusy ? "Applying…" : "✓ Apply all visible"}
          </button>
        </div>
      </div>
      ${this._renderRollupProgress()}
      <div class="filters">
        <input
          type="search"
          placeholder="Search insights (title)…"
          .value=${this._search}
          @input=${this._onSearch}
        />
        <label class="conf">
          Min confidence: ${Math.round(this._minConfidence * 100)}%
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            .value=${String(this._minConfidence)}
            @input=${this._onConfidence}
          />
        </label>
        <select
          aria-label="Sort by"
          .value=${this._sortBy}
          @change=${(e) => (this._sortBy = e.target
            .value)}
        >
          <option value="confidence">Sort: Confidence</option>
          <option value="age">Sort: Newest</option>
          <option value="detector">Sort: Detector</option>
        </select>
        <select
          aria-label="Group by"
          .value=${this._groupBy}
          @change=${(e) => (this._groupBy = e.target
            .value)}
        >
          <option value="none">Group: None</option>
          <option value="detector">Group: Detector</option>
          <option value="area">Group: Area</option>
          <option value="floor">Group: Floor</option>
          <option value="integration">Group: Integration</option>
        </select>
        <select
          aria-label="Audit suggest analysis depth"
          title="Controls how much reasoning the LLM does on 🤖 Suggest. Concise = ~150 token rules (cheap). In-depth = ~600 token rules with examples (better answers, ~4× input tokens)."
          .value=${this._auditDepth}
          @change=${(e) => (this._auditDepth = e.target
            .value)}
        >
          <option value="concise">🤖 Concise (cheap)</option>
          <option value="indepth">🤖 In-depth (4× tokens)</option>
        </select>
      </div>
      ${this._renderChipFilters()}
      <div class="filters" style="padding-top:0; padding-bottom:8px;">
        <span style="font-size:0.85em; color: var(--secondary-text-color);">
          Showing ${this._visibleInsightCount} of ${this._totalInsightCount}
          insight${this._totalInsightCount === 1 ? "" : "s"}
          ${this._anyChipActive()
            ? b `<a
                href="#"
                style="margin-left:8px;"
                @click=${(e) => {
                e.preventDefault();
                this._clearChipFilters();
            }}
                >clear filters</a
              >`
            : ""}
        </span>
      </div>
      <div class="body">
        ${this._renderCard()}
      </div>
      ${this._renderAuditLog()}
      ${this._toast ? b `<div class="toast">${this._toast}</div>` : ""}
    `;
    }
    _anyChipActive() {
        return (this._filterDomains.length > 0 ||
            this._filterAreas.length > 0 ||
            this._filterDeviceClasses.length > 0 ||
            this._filterDetectors.length > 0 ||
            this._filterFloors.length > 0 ||
            this._filterIntegrations.length > 0);
    }
    _clearChipFilters() {
        this._filterDomains = [];
        this._filterAreas = [];
        this._filterDeviceClasses = [];
        this._filterDetectors = [];
        this._filterFloors = [];
        this._filterIntegrations = [];
    }
    /** A row of small chips listing each detector and its insight count.
     *  Clicking a chip toggles that detector into / out of the detector
     *  filter — fastest way to "show me only the cooccurrence ones". The
     *  active chip is visually emphasized so you can tell what's filtered. */
    _renderRollupProgress() {
        const p = this._rollupProgress;
        const rec = this._recorderStatus;
        // Always render the recorder-window hint row when we have it so
        // users can see what window the rollup will actually fill — even
        // when no batch is in flight.
        let hint = "";
        if (rec) {
            const cfg = rec.configured_audit_window_days;
            const eff = rec.effective_window_days;
            const keep = rec.purge_keep_days;
            const clamped = cfg !== null && eff !== null && eff < cfg;
            hint = b `<div class="rollup-hint">
        ${cfg !== null
                ? b `Audit window: <strong>${cfg}</strong> days configured`
                : ""}
        ${keep !== null
                ? b ` · recorder keeps <strong>${keep}</strong> days`
                : ""}
        ${rec.oldest_record_age_days !== null
                ? b ` · oldest row
              <strong>${rec.oldest_record_age_days}</strong> days ago`
                : ""}
        ${eff !== null
                ? b ` · <span class=${clamped ? "rollup-hint-warn" : ""}
              >effective <strong>${eff}</strong> days${clamped
                    ? " (limited by recorder)"
                    : ""}</span
            >`
                : ""}
        ${clamped
                ? b `<div class="rollup-hint-tip">
              <strong>Good news:</strong> v1.2 incremental rollup is
              active — once a day is rolled up, its bucket counts
              are kept in HA Insights' own SQLite and
              <em>survive recorder purges</em>. You don't need to
              keep a huge recorder DB to build long-term seasonal
              patterns. Enable
              <code>Auto-refresh audit rollups every 6h</code> in
              Configure and the buckets accumulate over time. The
              effective window above is what's available
              <em>right now</em> for first-time backfill.
              ${keep !== null && keep < 30
                    ? b ` Default HA recorder retains
                    <strong>${keep}</strong> days — bumping
                    <code>recorder.purge_keep_days</code> in
                    <code>configuration.yaml</code> speeds up the
                    initial backfill but isn't required long term.`
                    : ""}
            </div>`
                : ""}
      </div>`;
        }
        if (!p || (!p.running && !p.last_summary)) {
            return hint
                ? b `<div class="rollup-row">${hint}</div>`
                : "";
        }
        const pct = p.total > 0 ? Math.min(100, Math.round((p.processed / p.total) * 100)) : 0;
        const eta = p.eta_sec !== undefined && p.running
            ? ` · ETA ${this._formatSec(p.eta_sec)}`
            : "";
        const summary = p.running
            ? b `<span class="rollup-stat">
          ${p.processed}/${p.total} (${pct}%) · ${p.window_days}d window${eta}
          ${p.current_entity_id
                ? b ` · <code>${p.current_entity_id}</code>`
                : ""}
          ${p.errors ? b ` · ${p.errors} err` : ""}
          ${p.timed_out ? b ` · ${p.timed_out} timeout` : ""}
        </span>`
            : b `<span class="rollup-stat rollup-stat-done">
          Last run: ${p.processed} done${p.errors ? `, ${p.errors} err` : ""}${p.timed_out ? `, ${p.timed_out} timeout` : ""}
        </span>`;
        return b `<div class="rollup-row">
      <div class="rollup-bar-wrap">
        <div class="rollup-bar">
          <div
            class="rollup-bar-fill ${p.running ? "is-running" : "is-done"}"
            style="width: ${p.running ? pct : 100}%"
          ></div>
        </div>
        ${summary}
      </div>
      ${hint}
    </div>`;
    }
    _formatSec(s) {
        if (s < 60)
            return `${Math.round(s)}s`;
        const m = Math.floor(s / 60);
        const r = Math.round(s % 60);
        return r ? `${m}m ${r}s` : `${m}m`;
    }
    _renderDetectorCounts() {
        const detectors = Object.keys(this._detectorCounts);
        if (detectors.length === 0)
            return "";
        const active = new Set(this._filterDetectors);
        // Order by count descending so the noisiest detectors land first.
        detectors.sort((a, b) => (this._detectorCounts[b] ?? 0) - (this._detectorCounts[a] ?? 0));
        return b `<div class="detector-counts">
      ${detectors.map((d) => {
            const count = this._detectorCounts[d] ?? 0;
            const isActive = active.has(d);
            return b `<button
          class="detector-chip ${isActive ? "is-active" : ""}"
          title=${isActive
                ? `Showing only ${d} insights — click to clear`
                : `Filter to ${d} insights only`}
          @click=${() => this._toggleDetectorChip(d)}
        >
          ${d}<span class="detector-chip-count">${count}</span>
        </button>`;
        })}
    </div>`;
    }
    _toggleDetectorChip(detector) {
        const active = new Set(this._filterDetectors);
        if (active.has(detector)) {
            active.delete(detector);
        }
        else {
            active.add(detector);
        }
        this._filterDetectors = Array.from(active);
    }
    /** Render a row of multi-select dropdowns for each filter axis.
     *  Each option list is built from the distinct values in the currently-
     *  loaded insight set so we never offer a filter that returns empty
     *  results. Area + Floor use registry display names when available so
     *  the user sees "Kitchen" instead of "kitchen_3a8b…". */
    _renderChipFilters() {
        const renderSelect = (label, values, selected, onChange, labelFor) => {
            if (values.length === 0)
                return "";
            return b `<select
        aria-label=${label}
        multiple
        size="1"
        style="min-width:110px;"
        @change=${(e) => {
                const select = e.target;
                const picked = Array.from(select.selectedOptions).map((o) => o.value);
                onChange(picked);
            }}
      >
        <option value="" ?selected=${selected.length === 0}>
          ${label}: All
        </option>
        ${values.map((v) => b `<option value=${v} ?selected=${selected.includes(v)}>
              ${labelFor ? labelFor(v) : v}
            </option>`)}
      </select>`;
        };
        return b `<div class="filters" style="padding-top:0;">
      ${renderSelect("Domain", this._availableDomains, this._filterDomains, (n) => (this._filterDomains = n))}
      ${renderSelect("Area", this._availableAreas, this._filterAreas, (n) => (this._filterAreas = n), (id) => this._areaNameById[id] ?? id)}
      ${renderSelect("Floor", this._availableFloors, this._filterFloors, (n) => (this._filterFloors = n), (id) => this._floorNameById[id] ?? id)}
      ${renderSelect("Integration", this._availableIntegrations, this._filterIntegrations, (n) => (this._filterIntegrations = n))}
      ${renderSelect("Device class", this._availableDeviceClasses, this._filterDeviceClasses, (n) => (this._filterDeviceClasses = n))}
      ${renderSelect("Detector", this._availableDetectors, this._filterDetectors, (n) => (this._filterDetectors = n))}
    </div>`;
    }
    _renderCard() {
        // Declarative binding so Lit reuses the SAME card element across panel
        // re-renders. Earlier we created the element imperatively each render,
        // which destroyed the card's internal state mid-refine (modal closed,
        // result discarded). Lit's html template diffs by tag + position; same
        // tag in the same slot = same element preserved.
        return b `
      <ha-insights-card
        .hass=${this.hass}
        .config=${this._embeddedCardConfig}
      ></ha-insights-card>
    `;
    }
}
__decorate([
    n({ attribute: false })
], HaInsightsPanel.prototype, "hass", void 0);
__decorate([
    n({ type: Boolean })
], HaInsightsPanel.prototype, "narrow", void 0);
__decorate([
    n({ attribute: false })
], HaInsightsPanel.prototype, "route", void 0);
__decorate([
    n({ attribute: false })
], HaInsightsPanel.prototype, "panel", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_search", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_minConfidence", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_sortBy", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_groupBy", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_backfillBusy", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_bulkBusy", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_scanBusy", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_rollupBusy", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_rollupProgress", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_recorderStatus", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_filterDomains", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_filterAreas", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_filterDeviceClasses", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_filterDetectors", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_filterFloors", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_filterIntegrations", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_auditDepth", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_totalInsightCount", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_visibleInsightCount", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_availableDomains", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_availableAreas", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_availableDeviceClasses", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_availableDetectors", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_availableFloors", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_availableIntegrations", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_areaNameById", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_floorNameById", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_detectorCounts", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_toast", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_auditOpen", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_auditLog", void 0);
__decorate([
    r()
], HaInsightsPanel.prototype, "_auditBusy", void 0);
// Guard against double-registration — only relevant if a future Lovelace
// resource ever imports this bundle directly (today only the integration
// auto-registers it). Cheap to be safe.
if (!customElements.get("ha-insights-panel")) {
    customElements.define("ha-insights-panel", HaInsightsPanel);
}

export { HaInsightsPanel };
//# sourceMappingURL=ha-insights-panel.js.map
