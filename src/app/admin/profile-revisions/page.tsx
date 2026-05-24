'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText, Clock, CheckCircle, XCircle, Loader2, Filter } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { adminApiRequest } from '@/lib/api/request';

interface LawyerCard {
  batch_id: string;
  lawyer_id: string;
  lawyer_name: string | null;
  reason: string;
  status: string;
  submitted_at: string;
  field_count: number;
  revision_ids: string[];
  fields: Array<{
    id: string;
    field_name: string;
    old_value: string;
    new_value: string;
    status: string;
    batch_id?: string;
  }>;
}

const fieldLabels: Record<string, string> = {
  name: '姓名', gender: '性别', law_firm: '所属律所',
  education: '最高学历', graduated_school: '毕业院校',
  working_years: '从业年限', city: '所在城市', license_no: '执业证号',
  phone: '手机号', email: '邮箱', wechat: '微信号',
  title: '头衔/职位', specialties: '擅长领域',
  intro: '个人简介',
};

const specialtyLabels: Record<string, string> = {
  criminal:'刑事案件', fraud:'诈骗案件', marriage:'婚姻家庭', property:'房产纠纷',
  contract:'合同纠纷', labor:'劳动纠纷', traffic:'交通事故', debt:'债务纠纷',
  theft:'盗窃案件', assault:'故意伤害', drugs:'毒品犯罪', economic:'经济犯罪',
  inheritance:'继承纠纷', loan:'借贷纠纷', medical:'医疗纠纷', corporate:'公司法务',
  intellectual:'知识产权', administrative:'行政诉讼', compensation:'人身损害赔偿',
  environment:'环境保护', consumer:'消费者权益', internet:'网络侵权',
  securities:'证券纠纷', insurance:'保险纠纷', bankruptcy:'破产清算', foreign:'涉外法律',
};
const genderMap: Record<string,string> = { male:'男', female:'女' };

function tVal(field:string,v:string):string{
  if(!v) return '空';
  if(field==='specialties'){
    try{ const a=JSON.parse(v); return Array.isArray(a)&&a.length>0 ? a.map((s:string)=>specialtyLabels[s]||s).join('、') : '空'; }
    catch{ return v.split(/[,，]/).map(s=>specialtyLabels[s.trim()]||s.trim()).filter(Boolean).join('、')||'空'; }
  }
  if(field==='gender') return genderMap[v]||v;
  return v.length>18?v.slice(0,18)+'...':v;
}

const SC:{[k:string]:{label:string;color:string,bgColor:string}}={
  pending:{label:'待审核',color:'text-yellow-600',bgColor:'bg-yellow-100'},
  approved:{label:'已通过',color:'text-green-600',bgColor:'bg-green-100'},
  rejected:{label:'已驳回',color:'text-red-600',bgColor:'bg-red-100'},
};

export default function ProfileRevisionsPage(){
  const [batches,setBatches]=useState<LawyerCard[]>([]);
  const [loading,setLoading]=useState(true);
  const [sf,setSf]=useState('all');
  const [pc,setPc]=useState(0);

  const fetch=useCallback(async()=>{
    setLoading(true);
    try{
      const p=new URLSearchParams();
      if(sf!=='all') p.set('status',sf);
      const r=await adminApiRequest(`/api/admin/lawyer-profile-revisions?${p}`);
      const j=await r.json();
      if(j.success){ setBatches(j.cards||[]); setPc(j.pendingCount||0); }
    }catch(e){ console.error(e); }finally{ setLoading(false); }
  },[sf]);

  useEffect(()=>{ fetch(); },[fetch]);

  function fmt(d:string){ return new Date(d).toLocaleDateString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}); }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">律师资料修改审核</h1>
          <p className="text-slate-500 mt-1 text-sm">审核律师提交的资料修改申请</p>
        </div>
        <Link href="/admin/dashboard" className="self-start inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
          <ArrowLeft className="w-4 h-4"/> 返回工作台
        </Link>
      </div>

      <div>
        {/* 统计 */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card className="border-gray-200"><CardContent className="pt-4 pb-4 text-center">
            <div className="flex items-center justify-center gap-2"><Clock className="w-5 h-5 text-yellow-500"/><span className="text-2xl font-bold">{pc}</span></div>
            <p className="text-sm text-muted-foreground mt-1">待审核</p>
          </CardContent></Card>
          <Card className="border-gray-200"><CardContent className="pt-4 pb-4 text-center">
            <div className="flex items-center justify-center gap-2"><CheckCircle className="w-5 h-5 text-green-500"/><span className="text-2xl font-bold">{batches.filter(b=>b.status==='approved').length}</span></div>
            <p className="text-sm text-muted-foreground mt-1">已通过</p>
          </CardContent></Card>
          <Card className="border-gray-200"><CardContent className="pt-4 pb-4 text-center">
            <div className="flex items-center justify-center gap-2"><XCircle className="w-5 h-5 text-red-500"/><span className="text-2xl font-bold">{batches.filter(b=>b.status==='rejected').length}</span></div>
            <p className="text-sm text-muted-foreground mt-1">已驳回</p>
          </CardContent></Card>
        </div>

        {/* 筛选 */}
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-4 h-4 text-gray-500"/>
          <span className="text-sm text-gray-600">状态：</span>
          {['all','pending','approved','rejected'].map(s=><Button key={s} variant={sf===s?'default':'outline'} size="sm" onClick={()=>setSf(s)} className={sf===s?'bg-blue-600':''}>{s==='all'?'全部':SC[s].label}</Button>)}
        </div>

        {/* 列表 */}
        {loading?<div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-500"/></div>
        :!batches.length?<Card><CardContent className="py-12 text-center"><FileText className="w-12 h-12 text-gray-300 mx-auto mb-4"/><p className="text-gray-500">暂无审核记录</p></CardContent></Card>
        :<div className="space-y-3">{batches.map(b=>{
          const si=SC[b.status]||SC.pending;
          return(
            <Card key={b.batch_id} className="border-gray-200 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2.5">
                      <Link href={`/admin/profile-revisions/${b.batch_id}`} className="font-semibold text-slate-800 hover:text-blue-600 transition-colors cursor-pointer">
                        {b.lawyer_name || '未知律师'}
                      </Link>
                      <Badge className={si.bgColor+' '+si.color}>{si.label}</Badge>
                      <Badge className="bg-blue-50 text-blue-600 border-blue-200">{b.field_count} 个字段</Badge>
                    </div>

                    <div className="space-y-1.5 mb-2.5">
                      {b.fields.map(f=>{
                        const fl=fieldLabels[f.field_name]||f.field_name;
                        const oldV=tVal(f.field_name,f.old_value);
                        const newV=tVal(f.field_name,f.new_value);
                        const changed=oldV!==newV&&f.new_value!=='';
                        return(
                          <div key={f.id} className="grid grid-cols-[90px_1fr_1fr] gap-x-3 gap-y-0.5 text-xs sm:text-sm items-baseline">
                            <span className="text-muted-foreground shrink-0">{fl}</span>
                            <span className={changed?'text-gray-400 line-through truncate':'text-gray-600 truncate'}>{oldV}</span>
                            <span className={changed?'text-green-600 font-medium truncate':'text-gray-500 truncate'}>{newV}</span>
                          </div>
                        );
                      })}
                    </div>

                    {b.reason&&<div className="mt-2 p-2 bg-purple-50 rounded-lg text-sm"><span className="text-purple-600 font-medium mr-1">原因:</span><span className="text-gray-700">{b.reason}</span></div>}
                    <div className="mt-1.5 text-xs text-muted-foreground">{fmt(b.submitted_at)}</div>
                  </div>

                  <div className="ml-3 shrink-0">
                    <Link href={`/admin/profile-revisions/${b.batch_id}`}>
                      <Button size="sm" className={b.status==='pending'?'bg-blue-600 hover:bg-blue-700':''}>
                        {b.status==='pending'?'审核':'查看'}
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}</div>}
      </div>
    </div>
  );
}
