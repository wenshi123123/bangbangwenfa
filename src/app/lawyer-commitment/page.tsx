'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function LawyerCommitmentPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="container mx-auto px-4 h-14 flex items-center">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>返回首页</span>
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <h1 className="text-2xl font-bold text-center mb-8">律师入驻承诺书</h1>
        
        <div className="prose prose-gray max-w-none space-y-6 text-sm leading-relaxed">
          <p className="text-muted-foreground text-center italic">
            请您仔细阅读以下承诺书内容，成为入驻律师即为认可！
          </p>

          <div className="bg-muted/50 rounded-lg p-6">
            <h2 className="text-lg font-semibold text-center mb-4">承诺书</h2>
            
            <p className="text-foreground leading-relaxed">
              本人承诺：本人在帮帮问法上提供的信息和材料均真实、合法、有效，否则，由此产生的一切不利后果，由本人自行承担。若因此致使加法蔚众（湛江）科技有限公司担责，本人承诺赔偿加法蔚众遭受的一切损失。
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t text-center">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
