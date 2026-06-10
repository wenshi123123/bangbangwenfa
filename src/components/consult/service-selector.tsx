'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';

interface ServicePlan {
  id: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  recommended?: boolean;
}

const servicePlans: ServicePlan[] = [
  {
    id: 'basic',
    name: '基础咨询',
    price: 99,
    description: '快速了解案件性质与法律风险',
    features: [
      '案件类型初步判断',
      '可能面临的法律后果',
      '基本的应对建议',
      '24小时内回复'
    ]
  },
  {
    id: 'standard',
    name: '标准方案',
    price: 399,
    description: '获得专业律师详细指导与执行建议',
    features: [
      '案件深度分析与评估',
      '个性化应对策略制定',
      '证据收集与整理指导',
      '法律文书的规范建议',
      '12小时内优先回复',
      '可追加提问1次'
    ],
    recommended: true
  },
  {
    id: 'advanced',
    name: '深度服务',
    price: 999,
    description: '全程跟进，含落地执行方案',
    features: [
      '一对一深度咨询服务',
      '完整案件分析报告',
      '可执行的行动方案',
      '全程跟进指导',
      '3次追加提问机会',
      '紧急情况优先响应',
      '微信直接沟通'
    ]
  }
];

interface ServiceSelectorProps {
  onSelectPlan: (planId: string) => void;
}

export function ServiceSelector({ onSelectPlan }: ServiceSelectorProps) {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {servicePlans.map((plan) => (
        <Card 
          key={plan.id}
          className={`relative flex flex-col transition-all duration-200 hover:shadow-[0_4px_16px_rgba(61,50,45,0.08)] ${
            plan.recommended 
              ? 'border-primary shadow-[0_4px_12px_rgba(61,50,45,0.06)] ring-2 ring-primary/20' 
              : ''
          }`}
        >
          {plan.recommended && (
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
              推荐方案
            </Badge>
          )}
          
          <CardHeader>
            <CardTitle className="text-xl">{plan.name}</CardTitle>
            <CardDescription className="mt-2">{plan.description}</CardDescription>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col">
            <div className="mb-6">
              <span className="text-4xl font-bold">¥{plan.price}</span>
              <span className="text-muted-foreground ml-1">/次</span>
            </div>
            
            <ul className="space-y-3 flex-1 mb-6">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            
            <Button 
              className="w-full" 
              variant={plan.recommended ? 'default' : 'outline'}
              onClick={() => onSelectPlan(plan.id)}
            >
              选择此方案
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export { servicePlans };
