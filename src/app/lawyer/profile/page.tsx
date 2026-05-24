'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  Shield,
  Award,
  Clock,
  CheckCircle,
  Loader2,
  Save,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useLawyerAuth } from '@/hooks/use-lawyer-auth';
import { LawyerBottomNav } from '@/components/lawyer/lawyer-bottom-nav';

interface LawyerProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  wechat: string;
  wechat_id: string;
  title: string;
  intro: string;
  specialties: string[];
  license_no: string;
  working_years: number;
  city: string;
  avatar_url: string;
  status: string;
  gender?: string;
  law_firm?: string;
  education?: string;
  graduated_school?: string;
}

interface PendingRevision {
  id: string;
  revision_type: string;
  old_value: string;
  new_value: string;
  status: string;
  submitted_at: string;
}

const fieldConfig = {
  basic: {
    title: '基本信息',
    icon: Award,
    color: '#C47353',
    fields: [
      { key: 'name', label: '姓名', type: 'text' },
      { key: 'gender', label: '性别', type: 'gender' },
      { key: 'law_firm', label: '所属律所', type: 'text' },
      { key: 'license_no', label: '执业证号', type: 'text' },
      { key: 'education', label: '最高学历', type: 'education' },
      { key: 'graduated_school', label: '毕业院校', type: 'text' },
      { key: 'working_years', label: '从业年限', type: 'number' },
      { key: 'city', label: '所在城市', type: 'city' },
    ],
  },
  contact: {
    title: '联系方式',
    icon: User,
    color: '#5C7A5A',
    fields: [
      { key: 'phone', label: '手机号', type: 'text' },
      { key: 'email', label: '邮箱', type: 'email' },
      { key: 'wechat', label: '微信号', type: 'text' },
    ],
  },
  professional: {
    title: '专业信息',
    icon: Shield,
    color: '#7B4B8B',
    fields: [
      { key: 'title', label: '头衔/职称', type: 'title' },
      { key: 'specialties', label: '擅长领域', type: 'specialties' },
      { key: 'intro', label: '个人简介', type: 'textarea' },
    ],
  },
};

const specialtyOptions = [
  { value: 'criminal', label: '刑事案件' },
  { value: 'fraud', label: '诈骗案件' },
  { value: 'marriage', label: '婚姻家庭' },
  { value: 'property', label: '房产纠纷' },
  { value: 'contract', label: '合同纠纷' },
  { value: 'labor', label: '劳动纠纷' },
  { value: 'traffic', label: '交通事故' },
  { value: 'debt', label: '债务纠纷' },
];

const fieldLabels: Record<string, string> = {
  name: '姓名',
  gender: '性别',
  law_firm: '所属律所',
  license_no: '执业证号',
  education: '最高学历',
  graduated_school: '毕业院校',
  working_years: '从业年限',
  city: '所在城市',
  phone: '手机号',
  email: '邮箱',
  wechat: '微信号',
  title: '头衔/职称',
  specialties: '擅长领域',
  intro: '个人简介',
};

// 全国省级 - 地级市数据
const provinceCityData: Record<string, string[]> = {
  '北京市': ['东城区','西城区','朝阳区','海淀区','丰台区','石景山区','通州区','大兴区','昌平区','顺义区','房山区','门头沟区','平谷区','怀柔区','密云区','延庆区'],
  '上海市': ['黄浦区','徐汇区','长宁区','静安区','普陀区','虹口区','杨浦区','浦东新区','闵行区','宝山区','嘉定区','松江区','青浦区','奉贤区','金山区','崇明区'],
  '天津市': ['和平区','河东区','河西区','南开区','河北区','红桥区','滨海新区','东丽区','西青区','津南区','北辰区','武清区','宝坻区','静海区','宁河区','蓟州区'],
  '重庆市': ['渝中区','江北区','沙坪坝区','九龙坡区','南岸区','渝北区','巴南区','涪陵区','万州区','黔江区','长寿区','江津区','合川区','永川区','南川区','綦江区','大足区','璧山区','铜梁区','潼南区','荣昌区','开州区','梁平区','武隆区'],
  '河北省': ['石家庄市','唐山市','秦皇岛市','邯郸市','邢台市','保定市','张家口市','承德市','沧州市','廊坊市','衡水市'],
  '山西省': ['太原市','大同市','阳泉市','长治市','晋城市','朔州市','晋中市','运城市','忻州市','临汾市','吕梁市'],
  '内蒙古自治区': ['呼和浩特市','包头市','乌海市','赤峰市','通辽市','鄂尔多斯市','呼伦贝尔市','巴彦淖尔市','乌兰察布市','兴安盟','锡林郭勒盟','阿拉善盟'],
  '辽宁省': ['沈阳市','大连市','鞍山市','抚顺市','本溪市','丹东市','锦州市','营口市','阜新市','辽阳市','盘锦市','铁岭市','朝阳市','葫芦岛市'],
  '吉林省': ['长春市','吉林市','四平市','辽源市','通化市','白山市','松原市','白城市','延边朝鲜族自治州'],
  '黑龙江省': ['哈尔滨市','齐齐哈尔市','鸡西市','鹤岗市','双鸭山市','大庆市','伊春市','佳木斯市','七台河市','牡丹江市','黑河市','绥化市','大兴安岭地区'],
  '江苏省': ['南京市','无锡市','徐州市','常州市','苏州市','南通市','连云港市','淮安市','盐城市','扬州市','镇江市','泰州市','宿迁市'],
  '浙江省': ['杭州市','宁波市','温州市','嘉兴市','湖州市','绍兴市','金华市','衢州市','舟山市','台州市','丽水市'],
  '安徽省': ['合肥市','芜湖市','蚌埠市','淮南市','马鞍山市','淮北市','铜陵市','安庆市','黄山市','滁州市','阜阳市','宿州市','六安市','亳州市','池州市','宣城市'],
  '福建省': ['福州市','厦门市','莆田市','三明市','泉州市','漳州市','南平市','龙岩市','宁德市'],
  '江西省': ['南昌市','景德镇市','萍乡市','九江市','新余市','鹰潭市','赣州市','吉安市','宜春市','抚州市','上饶市'],
  '山东省': ['济南市','青岛市','淄博市','枣庄市','东营市','烟台市','潍坊市','济宁市','泰安市','威海市','日照市','临沂市','德州市','聊城市','滨州市','菏泽市'],
  '河南省': ['郑州市','开封市','洛阳市','平顶山市','安阳市','鹤壁市','新乡市','焦作市','濮阳市','许昌市','漯河市','三门峡市','南阳市','商丘市','信阳市','周口市','驻马店市','济源市'],
  '湖北省': ['武汉市','黄石市','十堰市','宜昌市','襄阳市','鄂州市','荆门市','孝感市','荆州市','黄冈市','咸宁市','随州市','恩施土家族苗族自治州'],
  '湖南省': ['长沙市','株洲市','湘潭市','衡阳市','邵阳市','岳阳市','常德市','张家界市','益阳市','郴州市','永州市','怀化市','娄底市','湘西土家族苗族自治州'],
  '广东省': ['广州市','韶关市','深圳市','珠海市','汕头市','佛山市','江门市','湛江市','茂名市','肇庆市','惠州市','梅州市','汕尾市','河源市','阳江市','清远市','东莞市','中山市','潮州市','揭阳市','云浮市'],
  '广西壮族自治区': ['南宁市','柳州市','桂林市','梧州市','北海市','防城港市','钦州市','贵港市','玉林市','百色市','贺州市','河池市','来宾市','崇左市'],
  '海南省': ['海口市','三亚市','三沙市','儋州市'],
  '四川省': ['成都市','自贡市','攀枝花市','泸州市','德阳市','绵阳市','广元市','遂宁市','内江市','乐山市','南充市','眉山市','宜宾市','广安市','达州市','雅安市','巴中市','资阳市','阿坝藏族羌族自治州','甘孜藏族自治州','凉山彝族自治州'],
  '贵州省': ['贵阳市','六盘水市','遵义市','安顺市','毕节市','铜仁市','黔西南布依族苗族自治州','黔东南苗族侗族自治州','黔南布依族苗族自治州'],
  '云南省': ['昆明市','曲靖市','玉溪市','保山市','昭通市','丽江市','普洱市','临沧市','楚雄彝族自治州','红河哈尼族彝族自治州','文山壮族苗族自治州','西双版纳傣族自治州','大理白族自治州','德宏傣族景颇族自治州','怒江傈僳族自治州','迪庆藏族自治州'],
  '西藏自治区': ['拉萨市','日喀则市','昌都市','林芝市','山南市','那曲市','阿里地区'],
  '陕西省': ['西安市','铜川市','宝鸡市','咸阳市','渭南市','延安市','汉中市','榆林市','安康市','商洛市'],
  '甘肃省': ['兰州市','嘉峪关市','金昌市','白银市','天水市','武威市','张掖市','平凉市','酒泉市','庆阳市','定西市','陇南市','临夏回族自治州','甘南藏族自治州'],
  '青海省': ['西宁市','海东市','海北藏族自治州','黄南藏族自治州','海南藏族自治州','果洛藏族自治州','玉树藏族自治州','海西蒙古族藏族自治州'],
  '宁夏回族自治区': ['银川市','石嘴山市','吴忠市','固原市','中卫市'],
  '新疆维吾尔自治区': ['乌鲁木齐市','克拉玛依市','吐鲁番市','哈密市','昌吉回族自治州','博尔塔拉蒙古自治州','巴音郭楞蒙古自治州','阿克苏地区','克孜勒苏柯尔克孜自治州','喀什地区','和田地区','伊犁哈萨克自治州','塔城地区','阿勒泰地区'],
  '台湾省': ['台北市','高雄市','台中市','台南市','基隆市','新竹市','嘉义市'],
  '香港特别行政区': ['中西区','东区','南区','湾仔区','九龙城区','观塘区','深水埗区','黄大仙区','油尖旺区','离岛区','葵青区','北区','西贡区','沙田区','大埔区','荃湾区','屯门区','元朗区'],
  '澳门特别行政区': ['澳门半岛','氹仔','路环'],
};

const genderOptions = ['男', '女'];
const titleOptions = ['专职律师', '兼职律师', '普通合伙人', '高级合伙人'];
const educationOptions = ['专科', '本科', '硕士研究生', '博士研究生'];

export default function LawyerProfilePage() {
  const { user, isAuthorized, isLoading: authLoading, lawyerId, getAuthHeaders } =
    useLawyerAuth();
  const [profile, setProfile] = useState<LawyerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [error, setError] = useState('');
  const [pendingRevisions, setPendingRevisions] = useState<PendingRevision[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    gender: '',
    law_firm: '',
    license_no: '',
    education: '',
    graduated_school: '',
    working_years: '',
    city: '',
    phone: '',
    email: '',
    wechat: '',
    title: '',
    intro: '',
    specialties: [] as string[],
  });

  const [reason, setReason] = useState('');

  const fetchProfile = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch('/api/lawyer/profile', { headers });
      const result = await response.json();
      if (result.success && result.data) {
        const lawyer = result.data;
        setProfile(lawyer);
        const specialtiesData =
          lawyer.specialties ||
          (typeof lawyer.specialization === 'string'
            ? JSON.parse(lawyer.specialization || '[]')
            : []) ||
          [];
        setFormData({
          name: lawyer.name || lawyer.real_name || '',
          gender: lawyer.gender || '',
          law_firm: lawyer.law_firm || '',
          license_no: lawyer.license_no || '',
          education: lawyer.education || '',
          graduated_school: lawyer.graduated_school || '',
          working_years: lawyer.working_years?.toString() || '',
          city: lawyer.city || '',
          phone: lawyer.phone || '',
          email: lawyer.email || '',
          wechat: lawyer.wechat || '',
          title: lawyer.title || '',
          intro: lawyer.intro || lawyer.bio || '',
          specialties: Array.isArray(specialtiesData) ? specialtiesData : [],
        });
      }
    } catch {
      // 静默处理
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  const fetchPendingRevisions = useCallback(async () => {
    if (!lawyerId) return;
    try {
      const headers = getAuthHeaders();
      const response = await fetch(
        `/api/lawyer/profile/submit-review?lawyerId=${lawyerId}`,
        { headers }
      );
      if (!response.ok) {
        setPendingRevisions([]);
        return;
      }
      const text = await response.text();
      if (!text) {
        setPendingRevisions([]);
        return;
      }
      const result = JSON.parse(text);
      if (result.success) {
        setPendingRevisions(
          result.data.filter((r: PendingRevision) => r.status === 'pending')
        );
      }
    } catch {
      setPendingRevisions([]);
    }
  }, [lawyerId, getAuthHeaders]);

  useEffect(() => {
    if (!authLoading && isAuthorized) {
      fetchProfile();
      fetchPendingRevisions();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [authLoading, isAuthorized, fetchProfile, fetchPendingRevisions]);

  const hasPendingRevision = (key: string): boolean =>
    pendingRevisions.some((r) => r.revision_type === key);

  const hasFieldChange = (key: string): boolean => {
    if (!profile) return false;
    const oldValue = profile[key as keyof LawyerProfile];
    const newValue = formData[key as keyof typeof formData];
    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      return JSON.stringify(oldValue) !== JSON.stringify(newValue);
    }
    return String(oldValue || '') !== String(newValue || '');
  };

  const handleSubmitReview = async () => {
    if (!lawyerId) return;

    const changedFields: Array<{ field: string; oldValue: string; newValue: string }> = [];
    const checkFields = [
      'name', 'gender', 'law_firm', 'license_no',
      'education', 'graduated_school',
      'working_years', 'city',
      'phone', 'email', 'wechat',
      'title', 'specialties', 'intro',
    ] as const;

    for (const field of checkFields) {
      if (hasFieldChange(field)) {
        changedFields.push({
          field,
          oldValue:
            field === 'specialties'
              ? JSON.stringify(profile?.specialties || [])
              : (profile?.[field as keyof LawyerProfile] as string) || '',
          newValue:
            field === 'specialties'
              ? JSON.stringify(formData.specialties)
              : (formData[field as keyof typeof formData] as string),
        });
      }
    }

    if (changedFields.length === 0) {
      setError('请先修改内容后再提交');
      return;
    }
    if (!reason.trim()) {
      setError('请填写修改原因');
      return;
    }

    // 🔒 格式校验：手机号必须11位数字，执业证号必须17位数字
    for (const item of changedFields) {
      if (item.field === 'phone' && item.newValue && !/^\d{11}$/.test(item.newValue)) {
        setError('手机号必须为11位数字');
        return;
      }
      if (item.field === 'license_no' && item.newValue && !/^\d{17}$/.test(item.newValue)) {
        setError('执业证号必须为17位数字');
        return;
      }
    }

    setSubmitting(true);
    setError('');

    try {
      const batchId = crypto.randomUUID();
      const reqHeaders: HeadersInit = {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      };
      const response = await fetch('/api/lawyer/profile/submit-review', {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          lawyerId,
          batchId,
          reason: reason.trim(),
          changes: changedFields.map((item) => ({
            field: item.field,
            oldValue: item.oldValue,
            newValue: item.newValue,
          })),
        }),
      });
      const result = await response.json();
      if (!result.success) {
        setError(result.error || '提交失败');
        setSubmitting(false);
        return;
      }
      setSubmitSuccess(true);
      setShowSuccessModal(true);
      fetchPendingRevisions();
    } catch {
      setError('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSpecialty = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(value)
        ? prev.specialties.filter((s) => s !== value)
        : [...prev.specialties, value],
    }));
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F2]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-[#C47353] border-t-transparent animate-spin" />
          <span className="text-sm text-[#8C7B6E]">加载中…</span>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#FAF7F2]">
        <div className="bg-[#FFFBF5] rounded-2xl p-8 shadow-lg max-w-sm w-full text-center border border-[#E8D5C0]">
          <div className="w-14 h-14 rounded-full bg-[#C47353]/10 flex items-center justify-center mx-auto mb-4">
            <User className="w-7 h-7 text-[#C47353]" />
          </div>
          <h2 className="text-xl font-bold text-[#1C1917] mb-2 font-serif">请先登录</h2>
          <p className="text-[#78716C] mb-6">登录后即可编辑您的资料</p>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('open-login-modal'))}
            className="w-full py-3 bg-[#C47353] text-white font-medium rounded-xl hover:bg-[#A85D40] transition-colors"
          >
            手机号登录
          </button>
        </div>
      </div>
    );
  }

  const renderFieldInput = (config: { key: string; label: string; type: string }) => {
    const isPending = hasPendingRevision(config.key);
    const isChanged = hasFieldChange(config.key);

    // 性别
    if (config.type === 'gender') {
      return (
        <div className="flex gap-3">
          {genderOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, gender: option }))}
              disabled={isPending}
              className={`flex-1 py-2.5 rounded-xl border-2 font-medium text-sm transition-all duration-200 ${
                formData.gender === option
                  ? 'border-[#C47353] bg-[#C47353]/8 text-[#C47353]'
                  : 'border-[#E8D5C0] bg-white text-[#78716C] hover:border-[#C47353]/30'
              } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {option}
            </button>
          ))}
        </div>
      );
    }

    // 头衔/职称（单选）
    if (config.type === 'title') {
      return (
        <div className="grid grid-cols-2 gap-2">
          {titleOptions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, title: option }))}
              disabled={isPending}
              className={`py-2.5 rounded-xl border-2 font-medium text-sm transition-all duration-200 ${
                formData.title === option
                  ? 'border-[#C47353] bg-[#C47353]/8 text-[#C47353]'
                  : 'border-[#E8D5C0] bg-white text-[#78716C] hover:border-[#C47353]/30'
              } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {option}
            </button>
          ))}
        </div>
      );
    }

    // 最高学历
    if (config.type === 'education') {
      return (
        <select
          value={formData.education}
          onChange={(e) => setFormData((prev) => ({ ...prev, education: e.target.value }))}
          disabled={isPending}
          className={`w-full px-4 py-2.5 rounded-xl border-2 bg-white text-sm transition-all duration-200 appearance-none cursor-pointer ${
            isChanged && !isPending
              ? 'border-[#C47353]/40 focus:border-[#C47353]'
              : 'border-[#E8D5C0] focus:border-[#C47353]'
          } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23A89B90' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 14px center',
            paddingRight: '40px',
          }}
        >
          <option value="">请选择最高学历</option>
          {educationOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    // 所在城市（省级-地级市二级联动）
    if (config.type === 'city') {
      const provinces = Object.keys(provinceCityData);
      const currentProvince = provinces.find((p) => {
        const cities = provinceCityData[p];
        return cities.includes(formData.city) || false;
      });
      const cityList = currentProvince ? provinceCityData[currentProvince] : [];
      return (
        <div className="space-y-2">
          {/* 省 */}
          <select
            value={currentProvince || ''}
            onChange={(e) => {
              const province = e.target.value;
              if (province) {
                setFormData((prev) => ({ ...prev, city: provinceCityData[province][0] }));
              } else {
                setFormData((prev) => ({ ...prev, city: '' }));
              }
            }}
            disabled={isPending}
            className={`w-full px-4 py-2.5 rounded-xl border-2 bg-white text-sm transition-all duration-200 appearance-none cursor-pointer ${
              isChanged && !isPending
                ? 'border-[#C47353]/40 focus:border-[#C47353]'
                : 'border-[#E8D5C0] focus:border-[#C47353]'
            } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23A89B90' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 14px center',
              paddingRight: '40px',
            }}
          >
            <option value="">请选择省份</option>
            {provinces.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          {/* 市 */}
          {currentProvince && (
            <select
              value={formData.city}
              onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
              disabled={isPending}
              className={`w-full px-4 py-2.5 rounded-xl border-2 bg-white text-sm transition-all duration-200 appearance-none cursor-pointer ${
                isChanged && !isPending
                  ? 'border-[#C47353]/40 focus:border-[#C47353]'
                  : 'border-[#E8D5C0] focus:border-[#C47353]'
              } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23A89B90' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 14px center',
                paddingRight: '40px',
              }}
            >
              {cityList.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>
      );
    }

    if (config.type === 'specialties') {
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {specialtyOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleSpecialty(option.value)}
                disabled={isPending}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  formData.specialties.includes(option.value)
                    ? 'bg-[#C47353] text-white shadow-sm shadow-[#C47353]/20'
                    : 'bg-[#F5F0E8] text-[#78716C] hover:bg-[#EDE5DA]'
                } ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <div className="text-[11px] text-[#A89B90]">
            已选 {formData.specialties.length} 个领域
          </div>
        </div>
      );
    }

    if (config.type === 'textarea') {
      return (
        <Textarea
          value={formData[config.key as keyof typeof formData] as string}
          onChange={(e) => setFormData((prev) => ({ ...prev, [config.key]: e.target.value }))}
          placeholder={`请输入${config.label}`}
          rows={4}
          disabled={isPending}
          className={
            isChanged && !isPending
              ? 'border-[#C47353]/40 focus:border-[#C47353]'
              : 'border-[#E8D5C0] focus:border-[#C47353]'
          }
        />
      );
    }

    if (config.type === 'number') {
      return (
        <Input
          type="number"
          value={formData[config.key as keyof typeof formData] as string}
          onChange={(e) => setFormData((prev) => ({ ...prev, [config.key]: e.target.value }))}
          placeholder={`请输入${config.label}`}
          disabled={isPending}
          className={
            isChanged && !isPending
              ? 'border-[#C47353]/40 focus:border-[#C47353]'
              : 'border-[#E8D5C0] focus:border-[#C47353]'
          }
        />
      );
    }

    return (
      <Input
        type={config.key === 'phone' || config.key === 'license_no' ? 'text' : config.type}
        inputMode={config.key === 'phone' || config.key === 'license_no' ? 'numeric' : undefined}
        value={formData[config.key as keyof typeof formData] as string}
        onChange={(e) => {
          let value = e.target.value;
          // 手机号只允许数字，最多11位
          if (config.key === 'phone') {
            value = value.replace(/\D/g, '').slice(0, 11);
          }
          // 执业证号只允许数字，最多17位
          if (config.key === 'license_no') {
            value = value.replace(/\D/g, '').slice(0, 17);
          }
          setFormData((prev) => ({ ...prev, [config.key]: value }));
        }}
        placeholder={
          config.key === 'phone' ? '请输入11位手机号' :
          config.key === 'license_no' ? '请输入17位执业证号' :
          `请输入${config.label}`
        }
        maxLength={config.key === 'phone' ? 11 : config.key === 'license_no' ? 17 : undefined}
        disabled={isPending}
        className={
          isChanged && !isPending
            ? 'border-[#C47353]/40 focus:border-[#C47353]'
            : 'border-[#E8D5C0] focus:border-[#C47353]'
        }
      />
    );
  };

  return (
    <div className="min-h-screen pb-24 lg:pb-8 bg-[#FAF7F2]">
      {/* ===== 顶栏 ===== */}
      <div className="sticky top-0 z-40 bg-[#FDF8F0]/95 backdrop-blur-xl border-b border-[#E8D5C0]/50">
        <div className="px-4 py-3 flex items-center justify-between max-w-2xl lg:max-w-4xl mx-auto">
          <Link href="/lawyer" className="text-sm text-[#8C7B6E] hover:text-[#C47353] transition-colors">
            ← 返回工作台
          </Link>
          <span className="text-[15px] font-semibold text-[#1C1917] font-serif tracking-wide">我的资料</span>
          <div className="w-14" />
        </div>
      </div>

      <div className="max-w-2xl lg:max-w-4xl mx-auto px-4 py-5 space-y-5">
        {/* ===== 律师身份摘要卡 ===== */}
        <div className="bg-[#FFFBF5] rounded-2xl border border-[#E8D5C0] overflow-hidden shadow-sm">
          <div className="h-[3px] bg-gradient-to-r from-[#C47353] via-[#D4957A] to-[#E8C4A8]" />
          <div className="p-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4957A] to-[#C47353] flex items-center justify-center text-white text-xl font-serif flex-shrink-0 shadow-md shadow-[#C47353]/20">
              {profile?.name?.charAt(0) || '律'}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg text-[#1C1917] font-serif">{profile?.name || '未填写姓名'}</h2>
              <p className="text-xs text-[#78716C]">{profile?.title || '律师'}</p>
              {(profile?.license_no || profile?.law_firm) && (
                <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-[#A89B90]">
                  {profile?.license_no && <span>执业证号 {profile.license_no}</span>}
                  {profile?.law_firm && <span>｜ {profile.law_firm}</span>}
                </div>
              )}
            </div>
            <span className="text-[11px] bg-[#5C7A5A]/10 text-[#5C7A5A] px-3 py-1 rounded-full font-medium flex-shrink-0">
              已认证
            </span>
          </div>
        </div>

        {/* ===== 错误提示 ===== */}
        {error && (
          <div className="bg-[#C26565]/8 border border-[#C26565]/20 rounded-xl p-3 flex items-center gap-2 text-[#C26565] text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ===== 成功提示 ===== */}
        {submitSuccess && (
          <div className="bg-[#5C7A5A]/8 border border-[#5C7A5A]/20 rounded-xl p-3 flex items-center gap-2 text-[#5C7A5A] text-sm">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>修改申请已提交，等待平台审核（预计1-3个工作日）</span>
          </div>
        )}

        {/* ===== 审核说明 ===== */}
        <div className="bg-[#C47353]/5 border border-[#C47353]/12 rounded-xl p-3.5 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-[#C47353] flex-shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed">
            <p className="font-medium text-[#1C1917] mb-0.5">所有资料修改均需平台审核</p>
            <p className="text-[#78716C]">修改内容后点击「提交审核」，通过后生效。预计审核 1-3 个工作日。</p>
          </div>
        </div>

        {/* ===== 三组表单 ===== */}
        {[fieldConfig.basic, fieldConfig.contact, fieldConfig.professional].map((section) => (
          <div key={section.title} className="bg-[#FFFBF5] rounded-2xl border border-[#E8D5C0] overflow-hidden shadow-sm">
            <div className="h-[3px]" style={{ backgroundColor: section.color }} />
            <div className="p-4 lg:p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <section.icon className="w-4 h-4" style={{ color: section.color }} />
                <h3 className="font-semibold text-sm text-[#1C1917]">{section.title}</h3>
                <span className="text-[10px] bg-[#C8963E]/10 text-[#C8963E] px-2 py-0.5 rounded-full font-medium ml-auto">
                  需审核
                </span>
              </div>
              <div className="space-y-4">
                {section.fields.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={field.key} className="text-xs font-medium text-[#78716C]">
                        {field.label}
                      </Label>
                      {hasPendingRevision(field.key) && (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-[#C8963E]/10 text-[#C8963E] px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3" />
                          待审核
                        </span>
                      )}
                    </div>
                    {renderFieldInput(field)}
                    {hasFieldChange(field.key) && !hasPendingRevision(field.key) && (
                      <p className="text-[11px] text-[#C47353] font-medium">✓ 已修改，等待提交</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* ===== 待审核记录 + 修改原因（桌面端并排） ===== */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-4 space-y-5 lg:space-y-0">
          {/* 待审核记录 */}
          {pendingRevisions.length > 0 && (
            <div className="bg-[#FFFBF5] rounded-2xl border border-[#E8D5C0] overflow-hidden shadow-sm">
              <div className="h-[3px] bg-[#C8963E]" />
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-4 h-4 text-[#C8963E]" />
                  <h3 className="font-semibold text-sm text-[#1C1917]">待审核记录</h3>
                  <span className="text-[10px] bg-[#C8963E]/15 text-[#C8963E] px-2 py-0.5 rounded-full font-medium">
                    {pendingRevisions.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {pendingRevisions.map((rev) => (
                    <div key={rev.id} className="flex items-center justify-between py-1.5 px-2 bg-[#FDF8F0] rounded-lg">
                      <span className="text-sm font-medium text-[#1C1917]">
                        {fieldLabels[rev.revision_type] || rev.revision_type}
                      </span>
                      <span className="text-[11px] text-[#A89B90]">{formatDate(rev.submitted_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 修改原因 */}
          <div className="bg-[#FFFBF5] rounded-2xl border border-[#E8D5C0] overflow-hidden shadow-sm">
            <div className="h-[3px] bg-[#7B4B8B]" />
            <div className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="w-4 h-4 text-[#7B4B8B]" />
                <h3 className="font-semibold text-sm text-[#1C1917]">修改原因</h3>
                <span className="text-[10px] bg-[#C26565]/10 text-[#C26565] px-2 py-0.5 rounded-full font-medium ml-auto">
                  必填
                </span>
              </div>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="请简要说明本次修改的原因（如：身份证更换、业务调整等）"
                rows={3}
                disabled={pendingRevisions.length > 0}
                className={
                  reason.trim()
                    ? 'border-[#7B4B8B]/40 focus:border-[#7B4B8B]'
                    : 'border-[#E8D5C0] focus:border-[#C47353]'
                }
              />
            </div>
          </div>
        </div>

        {/* ===== 提交审核按钮 ===== */}
        <div className="pt-2">
          <button
            onClick={handleSubmitReview}
            disabled={submitting || showSuccessModal || pendingRevisions.length > 0}
            className="w-full py-3.5 rounded-2xl font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] bg-[#C47353] text-white hover:bg-[#A85D40] shadow-lg shadow-[#C47353]/25 flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                提交中…
              </>
            ) : pendingRevisions.length > 0 ? (
              <>
                <Clock className="w-4 h-4" />
                有待审核内容，请等待
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                提交审核
              </>
            )}
          </button>
        </div>
      </div>

      {/* ===== 提交成功弹窗 ===== */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl text-center">
            <div className="w-16 h-16 rounded-full bg-[#5C7A5A]/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-[#5C7A5A]" />
            </div>
            <h3 className="text-lg font-bold text-[#1C1917] mb-2 font-serif">提交成功</h3>
            <p className="text-sm text-[#78716C] mb-6 leading-relaxed">
              您的资料修改申请已成功提交，平台将在 <span className="font-medium text-[#1C1917]">1-3 个工作日</span> 内完成审核，请耐心等待。
            </p>
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="w-full bg-[#C47353] hover:bg-[#A85D40] text-white"
            >
              我知道了
            </Button>
          </div>
        </div>
      )}

      <LawyerBottomNav />
    </div>
  );
}
