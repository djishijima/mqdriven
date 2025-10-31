import React from "react";

type State={hasError:boolean; msg?:string};
export default class ErrorBoundary extends React.Component<
  React.PropsWithChildren, State
>{
  constructor(p:any){super(p); this.state={hasError:false}}
  static getDerivedStateFromError(e:Error){ return {hasError:true, msg:e?.message} }
  componentDidCatch(e:Error, info:any){ console.error("UI Crash:", e, info) }
  render(){
    if(this.state.hasError){
      return (
        <div style={{padding:16,fontFamily:"system-ui"}}>
          <h2>画面でエラーが発生しました</h2>
          <pre style={{whiteSpace:"pre-wrap"}}>{this.state.msg||"Unknown error"}</pre>
          <button onClick={()=>location.reload()}>再読み込み</button>
        </div>
      );
    }
    return this.props.children;
  }
}
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (e) => {
    console.error('UnhandledRejection', e.reason);
    e.preventDefault?.();
    const m = (e?.reason?.message)||'予期せぬエラーが発生しました';
    try { window.dispatchEvent(new CustomEvent('app:toast',{detail:{type:'error',message:m}})); } catch {}
  });
  window.addEventListener('error', (e) => {
    console.error('WindowError', e?.error||e?.message);
    const m = (e?.error?.message)||e?.message||'エラー';
    try { window.dispatchEvent(new CustomEvent('app:toast',{detail:{type:'error',message:m}})); } catch {}
  });
}
