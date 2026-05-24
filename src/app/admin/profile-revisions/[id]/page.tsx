'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock, CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { adminApiRequest } from '@/lib/api/request';

interface BatchField {
  id: string;
  field_name: string;
  old_value: string;
  new_value: string;
  status: string;
  revision_type?: string;
}

interface Batch {
  batch_id: string;
  lawyer_id: string;
  lawyer_name: string | null;
  lawyer_phone: string | null;
  reason: string;
  status: string;
  submitted_at: string;
  revisions: BatchField[];
}

const FL: Record<string,string> = {
  name:'姓名', gender:'性别', law_firm:'所属律所',
  education:'最高学历', graduated_school:'毕业院校',
  working_years:'从业年限', city:'所在城市', license_no:'执业证号',
  phone:'手机号', email:'邮箱', wechat:'微信号',
  title:'头衔/职位', specialties:'擅长领域', intro:'个人简介',
};

const SL: Record<string,string> = {
  criminal:'刑事案件', fraud:'诈骗案件', marriage:'婚姻家庭', property:'房产纠纷',
  contract:'合同纠纷', labor:'劳动纠纷', traffic:'交通事故', debt:'债务纠纷',
  theft:'盗窃案件', assault:'故意伤害', drugs:'毒品犯罪', economic:'经济犯罪',
  inheritance:'继承纠纷', loan:'借贷纠纷', medical:'医疗纠纷', corporate:'公司法务',
  intellectual:'知识产权', administrative:'行政诉讼', compensation:'人身损害赔偿',
  environment:'环境保护', consumer:'消费者权益', internet:'网络侵权',
  securities:'证券纠纷', insurance:'保险纠纷', bankruptcy:'破产清算', foreign:'涉外法律',
};
const GM: Record<string,string> = { male:'男', female:'女' };

function tV(f:string,v:string):string{
  if(!v) return '';
  if(f==='specialties'){
    try{ const a=JSON.parse(v); return Array.isArray(a)?a.map(s=>SL[s]||s).join('、'):v; }
    catch{ return v.split(/[,，]/).map(s=>SL[s.trim()]||s.trim()).filter(Boolean).join('、')||v; }
  }
  if(f==='gender') return GM[v]||v;
  return v;
}
const SC:{[k:string]:{label:string,bgColor:string,color:string}}={
  pending:{label:'待审核',bgColor:'bg-yellow-100',color:'text-yellow-700'},
  approved:{label:'已通过',bgColor:'bg-green-100',color:'text-green-700'},
  rejected:{label:'已驳回',bgColor:'bg-red-100',color:'text-red-700'},
};

export default function ProfileRevisionDetailPage(){
  const params=useParams();
  const router=useRouter();
  const [batch,setBatch]=useState<Batch|null>(null);
  const [loading,setLoading]=useState(true);
  const [submitting,setSubmitting]=useState(false);
  const [comment,setComment]=useState('');
  const [err,setErr]=useState('');
  const [confirmAction,setConfirmAction]=useState<'approve'|'reject'|null>(null);

  const fetchBatch=useCallback(async()=>{
    try{
      const r=await adminApiRequest(`/api/admin/lawyer-profile-revisions/${params.id}`);
      const j=await r.json();
      if(j.success) setBatch(j.batch);
      else setErr(j.error||'获取详情失败');
    }catch(e){ console.error(e); setErr('获取详情失败'); }finally{ setLoading(false); }
  },[params.id]);

  useEffect(()=>{ if(params.id) fetchBatch(); },[params.id,fetchBatch]);

  const handleReview=async(action:'approve'|'reject')=>{
    if(action==='reject'&&!comment.trim()){ setErr('请填写驳回原因'); return; }
    setSubmitting(true); setErr('');
    try{
      const r=await adminApiRequest(`/api/admin/lawyer-profile-revisions/${params.id}`,{
        method:'PUT',
        headers:{ 'Content-Type':'application/json' },
        body:JSON.stringify({ action, comment:comment.trim() }),
      });
      const j=await r.json();
      if(j.success) router.push('/admin/profile-revisions');
      else setErr(j.error||'操作失败');
    }catch(e){ console.error(e); setErr('操作失败，请重试'); }finally{ setSubmitting(false); }
  };

  function fmt(d:string){ return new Date(d).toLocaleDateString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}); }

  if(loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-500"/></div>;

  if(!batch) return(
    <div className="flex items-center justify-center p-4 py-20">
      <Card className="max-w-md"><CardContent className="pt-6 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4"/>
        <h2 className="text-xl font-bold mb-2">获取详情失败</h2>
        <p className="text-muted-foreground mb-4">{err||'记录不存在'}</p>
        <Link href="/admin/profile-revisions"><Button>返回列表</Button></Link>
      </CardContent></Card>
    </div>
  );

  const isPending=batch.status==='pending';

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin/profile-revisions" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700"><ArrowLeft className="w-4 h-4"/>返回列表</Link>
          <span className="text-slate-300">|</span>
          <h1 className="text-lg sm:text-xl font-bold text-slate-800">资料修改审核</h1>
        </div>
        <Badge className={(SC[batch.status]?.bgColor||'')+' '+((SC[batch.status]?.color)||'')}>{SC[batch.status]?.label||batch.status}</Badge>
      </div>

      <div className="max-w-4xl space-y-6">
        {err&&<div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2 text-red-700"><AlertCircle className="w-5 h-5 flex-shrink-0"/><span className="text-sm">{err}</span></div>}

        {/* 申请信息 */}
        <Card className="border-gray-200">
          <CardHeader><CardTitle className="text-base">申请信息</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-muted-foreground">律师姓名：</span><span className="font-medium">{batch.lawyer_name||'未知'}</span></div>
              <div><span className="text-muted-foreground">修改字段数：</span><span className="font-medium text-blue-600">{batch.revisions.length} 个</span></div>
              <div><span className="text-muted-foreground">提交时间：</span><span>{fmt(batch.submitted_at)}</span></div>
              <div><span className="text-muted-foreground">当前状态：</span><Badge className={SC[batch.status]?.bgColor+' '+SC[batch.status]?.color}>{SC[batch.status]?.label||batch.status}</Badge></div>
            </div>
            {batch.reason&&<div className="mt-2 p-3 bg-purple-50 rounded-lg border border-purple-200"><div className="flex items-center gap-2 mb-1"><span className="text-purple-600 font-medium text-sm">修改原因</span></div><p className="text-gray-700 whitespace-pre-wrap text-sm">{batch.reason}</p></div>}
          </CardContent>
        </Card>

        {/* 字段对比表格 */}
        <Card className="border-gray-200">
          <CardHeader><CardTitle className="text-base">修改内容对比</CardTitle></CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead><tr className="bg-slate-50">
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600 border-b">字段</th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600 border-b w-[40%]">
                    <XCircle className="w-4 h-4 inline mr-1 text-gray-400"/>原值
                  </th>
                  <th className="px-4 py-2.5 text-left font-medium text-slate-600 border-b w-[40%]">
                    <CheckCircle className="w-4 h-4 inline mr-1 text-green-500"/>新值
                  </th>
                </tr></thead>
                <tbody>{batch.revisions.map(r=>{
                  const fn=r.field_name||r.revision_type||'';
                  const fl=FL[fn]||fn;
                  const oldV=tV(fn,r.old_value);
                  const newV=tV(fn,r.new_value);
                  const changed=oldV!==newV&&(r.new_value!=='');
                  return(
                    <tr key={r.id} className={changed?'bg-green-50/30':'hover:bg-slate-50'}>
                      <td className="px-4 py-3 border-b font-medium text-slate-700 align-top">{fl}</td>
                      <td className={`px-4 py-3 border-b align-top ${changed?'text-gray-400 line-through':''}`}>{oldV||<span className="italic text-gray-300">未填写</span>}</td>
                      <td className={`px-4 py-3 border-b align-top ${changed?'text-green-700 font-medium':''}`}>{newV||<span className="italic text-gray-300">未填写</span>}</td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* 审核操作 */}
        {isPending?<Card className="border-blue-200">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertCircle className="w-5 h-5 text-blue-600"/>审核操作</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label htmlFor="comment">审核备注（驳回时必填）</Label>
              <Textarea id="comment" value={comment} onChange={e=>setComment(e.target.value)} placeholder="请输入审核备注，通过时可留空，驳回时请说明原因" rows={3}/>
            </div>
            {/* 格式校验提示 */}
            {batch.revisions.some(r =>
              (r.field_name==='phone'&&r.new_value&&!/^\d{11}$/.test(r.new_value))||
              (r.field_name==='license_no'&&r.new_value&&!/^\d{17}$/.test(r.new_value))
            )&&(
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 text-amber-800">
                <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0"/>
                <span className="text-sm">⚠️ 检测到手机号或执业证号格式不符合要求（手机号11位 / 执业证号17位），请确认后操作</span>
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50" onClick={()=>setConfirmAction('reject')} disabled={submitting}>
                {submitting&&confirmAction==='reject'?<Loader2 className="w-4 h-4 animate-spin mr-2"/>:<XCircle className="w-4 h-4 mr-2"/>}驳回
              </Button>
              <Button className="flex-1 bg-green-600 hover:bg-green-700" onClick={()=>setConfirmAction('approve')} disabled={submitting}>
                {submitting&&confirmAction==='approve'?<Loader2 className="w-4 h-4 animate-spin mr-2"/>:<CheckCircle className="w-4 h-4 mr-2"/>}通过
              </Button>
            </div>
          </CardContent>
        </Card>:<Card className="border-gray-200">
          <CardHeader><CardTitle className="text-base">审核结果</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm"><span className="text-muted-foreground">状态：</span><Badge className={SC[batch.status]?.bgColor+' '+SC[batch.status]?.color}>{SC[batch.status]?.label||batch.status}</Badge></div>
          </CardContent>
        </Card>}
      </div>

      {/* 二次确认弹窗 */}
      {confirmAction&&batch&&(
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setConfirmAction(null)}>
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl" onClick={e=>e.stopPropagation()}>
            <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3"/>
            <h3 className="text-lg font-bold text-center mb-2">
              确认{confirmAction==='approve'?'通过':'驳回'}？
            </h3>
            <p className="text-sm text-gray-500 text-center mb-4">
              {confirmAction==='approve'
                ?`将修改 ${batch.lawyer_name||'律师'} 的 ${batch.revisions.length} 个字段数据，通过后立即生效`
                :`将驳回 ${batch.lawyer_name||'律师'} 的修改申请`}
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={()=>setConfirmAction(null)} disabled={submitting}>取消</Button>
              <Button
                className={`flex-1 ${confirmAction==='approve'?'bg-green-600 hover:bg-green-700':'bg-red-600 hover:bg-red-700'}`}
                onClick={()=>{ handleReview(confirmAction); setConfirmAction(null); }}
                disabled={submitting}
              >
                确认{confirmAction==='approve'?'通过':'驳回'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
