import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Form, Input, InputNumber, Modal, Select, Spin, Switch, Tag, message } from 'antd';
import { PencilRuler, Save, Wand2 } from "lucide-react";
import { useLocation, useNavigate } from 'react-router-dom';
import api, { getUploadBaseUrl } from '../utils/api';
import { useAuthStore } from '../store/authStore';
import './Transform.css';
import { LucideIcon } from "../components/icons/lucide";

const { TextArea } = Input;

const PRESET_PRODUCTS = [
  { value: '手机壳', label: '手机壳' },
  { value: 'T恤', label: 'T恤' },
  { value: '马克杯', label: '马克杯' },
  { value: '帆布袋', label: '帆布袋' },
  { value: '明信片', label: '明信片' },
];

const STYLE_PRESETS = [
  { value: '水墨', label: '水墨' },
  { value: '水彩', label: '水彩' },
  { value: '国潮', label: '国潮' },
  { value: '工笔', label: '工笔' },
  { value: '剪纸', label: '剪纸' },
  { value: '景泰蓝釉彩', label: '景泰蓝釉彩' },
];

const TEMPLATE_PLACEHOLDERS = {
  productCustom: '例如：iPhone17 手机壳、保温杯、帆布托特包',
  styleCustom: '例如：赛博国风、宋画、敦煌配色',
  heritageHint: '例如：剪纸、苏绣、景泰蓝、宣纸肌理',
  description: '示例：孤舟老翁的湖景，远山薄雾，留白高级，水墨层次自然，适合手机壳背板构图',
  extraPrompt: '示例：无文字无logo、背景简洁、质感真实、边缘留白避开摄像头区',
};

function Transform() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [artworkModalVisible, setArtworkModalVisible] = useState(false);
  const [artworkForm] = Form.useForm();
  const [previewImage, setPreviewImage] = useState(null);
  const previewRef = useRef(null);
  const [showOptional, setShowOptional] = useState(true);

  useAuthStore();

  const query = useMemo(() => new URLSearchParams(location.search || ''), [location.search]);
  const heritageFromQuery = (query.get('heritage') || query.get('skillName') || query.get('q') || '').trim();

  useEffect(() => {
    // 来自“非遗学习/搜索”的灵感：可直接回填（可选项里展示）
    if (heritageFromQuery) {
      form.setFieldsValue({ heritageHint: heritageFromQuery });
      setShowOptional(true);
    }
  }, [form, heritageFromQuery]);

  const buildProductLabel = (values) => {
    const preset = String(values.productPreset || '').trim();
    const custom = String(values.productCustom || '').trim();
    return custom || preset || '其他';
  };

  const buildStylePrompt = (values) => {
    const preset = String(values.stylePreset || '').trim();
    const custom = String(values.styleCustom || '').trim();
    const style = custom || preset || '';
    return style;
  };

  const getAiModelDisplay = (data) => {
    const ai = data?.ai;
    if (!ai) {
      return '未调用AI模型（本地兜底）';
    }

    const models = [];
    const stage1 = ai.pipeline?.stage1;
    const stage2 = ai.pipeline?.stage2;
    const stage2Applied = Boolean(ai.pipeline?.stage2Applied);

    if (stage1) models.push(stage1);
    if (stage2Applied && stage2) models.push(stage2);
    if (models.length === 0 && ai.model) models.push(ai.model);

    const uniqueModels = [...new Set(models.filter(Boolean))];
    if (uniqueModels.length === 0) {
      return '未识别到模型';
    }
    return uniqueModels.join(' -> ');
  };

  const handleGeneratePreview = async () => {
    const values = form.getFieldsValue();
    const description = String(values.description || '').trim();
    if (!description) {
      message.warning('请先填写“描述”，再生成效果');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        productType: buildProductLabel(values),
        stylePrompt: buildStylePrompt(values),
        description: String(values.description || '').trim(),
        extraPrompt: String(values.extraPrompt || '').trim(),
        heritageHint: String(values.heritageHint || '').trim(),
      };

      const response = await api.post('/ai/generate-product', payload, { timeout: 120000 });

      if (response.data.success) {
        const data = response.data.data;
        setResult(data);
        const uploadBase = getUploadBaseUrl();
        setPreviewImage(`${uploadBase}${data.transformedImageUrl}`);
        message.success('预览生成成功！');
        setTimeout(() => previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 200);
      } else {
        message.error(response.data.message || '生成失败');
      }
    } catch (error) {
      console.error('生成预览失败:', error);
      const errMsg = error.response?.data?.message || error.message || '生成预览失败，请重试';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // 生成并保存
  const handleGenerateAndSave = async (values) => {
    if (!result) {
      await handleGeneratePreview();
      return;
    }

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('imageUrl', result.transformedImageUrl);
      const current = form.getFieldsValue();
      const productLabel = buildProductLabel(current);
      const styleLabel = buildStylePrompt(current);
      formData.append('title', values.title || `数字焕新作品 - ${productLabel}${styleLabel ? `（${styleLabel}）` : ''}`);
      formData.append('description', values.description || '通过数字焕新功能生成的文创产品');
      formData.append('category', '其他');
      formData.append('tags', '数字焕新,文创产品');
      formData.append('status', 'published');

      const response = await api.post('/artworks', formData);

      if (response.data.success) {
        const artwork = response.data.data.artwork;
        const artworkImageUrl = artwork.imageUrl;

        console.log('✅ 作品保存成功:', { artworkId: artwork.id, imageUrl: artworkImageUrl });

        // 如果选择了发布到商城，创建产品
        if (values.publishToShop) {
          if (!values.price || values.price <= 0) {
            message.error('发布到商城需要设置价格');
            setSaving(false);
            return;
          }

          if (!artworkImageUrl) {
            message.error('作品图片URL不存在，无法发布到商城');
            setSaving(false);
            return;
          }

          try {
            // 产品类别映射（产品类别：'T恤', '手机壳', '帆布袋', '明信片', '其他'）
            const categoryMap = {
              'T恤': 'T恤',
              '手机壳': '手机壳',
              '帆布袋': '帆布袋',
              '明信片': '明信片',
              '马克杯': '其他'
            };
            const current = form.getFieldsValue();
            const productLabel = buildProductLabel(current);
            const normalized = productLabel.includes('手机壳') ? '手机壳' : productLabel;
            const productCategory = categoryMap[normalized] || '其他';

            const productData = {
              name: values.title || `数字焕新作品 - ${productLabel}`,
              description: values.description || '通过数字焕新功能生成的文创产品',
              images: [artworkImageUrl],
              price: parseFloat(values.price),
              category: productCategory,
              patternId: artwork.id, // 关联作品ID
              status: 'published',
              stock: 999 // 默认库存
            };

            console.log('🛍️ 发布到商城，产品数据:', productData);

            const productResponse = await api.post('/products', productData);

            if (productResponse.data.success) {
              message.success('作品和商品发布成功！');
              setArtworkModalVisible(false);
              artworkForm.resetFields();
              navigate(`/shop`);
            } else {
              const errorMsg = productResponse.data.message || '未知错误';
              console.error('❌ 发布到商城失败:', errorMsg, productResponse.data);
              message.warning(`作品保存成功，但发布到商城失败：${errorMsg}`);
            }
          } catch (productError) {
            console.error('❌ 发布到商城失败（异常）:', productError);
            const errorMessage = productError.response?.data?.message || productError.message || '未知错误';
            console.error('错误详情:', {
              status: productError.response?.status,
              data: productError.response?.data,
              message: errorMessage
            });
            message.error(`发布到商城失败：${errorMessage}`);
          }
        } else {
          message.success('作品保存成功！');
          setArtworkModalVisible(false);
          artworkForm.resetFields();
          navigate(`/artworks/${artwork.id}`);
        }
      } else {
        message.error(response.data.message || '保存失败');
      }
    } catch (error) {
      console.error('保存失败:', error);
      message.error('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="transform-page">
      <div className="transform-header transform-header-compact">
        <div className="transform-header-titleRow">
          <h1 className="transform-title">数字焕新</h1>
          <div className="transform-header-actions">
            <Button size="small" onClick={() => navigate('/heritage-learn')}>去非遗学习</Button>
            <Button size="small" onClick={() => navigate('/learn')}>去 AI 学艺</Button>
          </div>
        </div>
        <p className="transform-subtitle">
          选择产品与风格，写下描述，让 AI 直接生成文创效果图。
        </p>
        {heritageFromQuery ? (
          <div className="transform-header-tags">
            <Tag color="blue">来自灵感：{heritageFromQuery}</Tag>
          </div>
        ) : null}
      </div>

      <div className="transform-container transform-twoPane">
        {/* 左侧：输入区（尽量单屏，无滚动） */}
        <div className="transform-leftPane">
          <div className="transform-card transform-mainCard">
            <div className="transform-cardTitle">创作参数</div>
            <Form
              form={form}
              layout="vertical"
              className="transform-form"
              requiredMark={false}
            >
              <div className="transform-grid2">
                <Form.Item name="productPreset" label="产品（预设）" className="transform-item">
                  <Select
                    options={PRESET_PRODUCTS}
                    placeholder="选择产品"
                    size="middle"
                    onChange={() => setResult(null)}
                  />
                </Form.Item>
                <Form.Item name="productCustom" label="产品（自定义，可覆盖预设）" className="transform-item">
                  <Input
                    placeholder={TEMPLATE_PLACEHOLDERS.productCustom}
                    onChange={() => setResult(null)}
                  />
                </Form.Item>
              </div>

              <div className="transform-grid2">
                <Form.Item name="stylePreset" label="风格（预设）" className="transform-item">
                  <Select
                    options={STYLE_PRESETS}
                    placeholder="选择风格"
                    size="middle"
                    onChange={() => setResult(null)}
                  />
                </Form.Item>
                <Form.Item name="styleCustom" label="风格（自定义，可覆盖预设）" className="transform-item">
                  <Input
                    placeholder={TEMPLATE_PLACEHOLDERS.styleCustom}
                    onChange={() => setResult(null)}
                  />
                </Form.Item>
              </div>

              <div className="transform-optionalToggle">
                <Button type="link" onClick={() => setShowOptional((v) => !v)}>
                  {showOptional ? '收起可选项' : '展开可选项（自定义/灵感/细节）'}
                </Button>
              </div>

              {showOptional ? (
                <>
                  <Form.Item name="heritageHint" label="非遗灵感（可选）" className="transform-item">
                    <Input
                      placeholder={TEMPLATE_PLACEHOLDERS.heritageHint}
                      onChange={() => setResult(null)}
                    />
                  </Form.Item>
                </>
              ) : null}

              <Form.Item
                name="description"
                label="描述（必填）"
                rules={[{ required: true, message: '请填写描述' }]}
                className="transform-item"
              >
                <TextArea
                  rows={3}
                  placeholder={TEMPLATE_PLACEHOLDERS.description}
                  onChange={() => setResult(null)}
                />
              </Form.Item>

              {showOptional ? (
                <Form.Item name="extraPrompt" label="细节要求（可选）" className="transform-item">
                  <TextArea
                    rows={2}
                    placeholder={TEMPLATE_PLACEHOLDERS.extraPrompt}
                    onChange={() => setResult(null)}
                  />
                </Form.Item>
              ) : null}

              <div className="transform-formActions">
                <Button
                  type="primary"
                  icon={<LucideIcon icon={Wand2} />}
                  loading={loading}
                  onClick={handleGeneratePreview}
                  className="generate-btn"
                  block
                >
                  生成效果
                </Button>
                {result ? (
                  <Button
                    icon={<LucideIcon icon={PencilRuler} />}
                    onClick={() => {
                      const current = form.getFieldsValue();
                      const productLabel = buildProductLabel(current);
                      const styleLabel = buildStylePrompt(current);
                      const description = String(current.description || '').trim();
                      const migratedDescription = [
                        description,
                        productLabel ? `产品：${productLabel}` : '',
                        styleLabel ? `风格：${styleLabel}` : '',
                      ].filter(Boolean).join('；');

                      navigate('/heritage-sketch', {
                        state: {
                          sourceImageUrl: result.transformedImageUrl,
                          sourceDescription: migratedDescription,
                          sourceProductType: productLabel,
                          sourceStylePrompt: styleLabel,
                        },
                      });
                    }}
                    className="save-btn secondary"
                    block
                  >
                    迁移到一笔成纹
                  </Button>
                ) : null}
                {result ? (
                  <Button
                    icon={<LucideIcon icon={Save} />}
                    loading={saving}
                    onClick={() => setArtworkModalVisible(true)}
                    className="save-btn secondary"
                    block
                  >
                    保存/发布
                  </Button>
                ) : null}
              </div>
            </Form>
          </div>

        </div>

        {/* 右侧：预览区 */}
        <div className="transform-rightPane" ref={previewRef}>
          <div className="transform-card preview-card">
            <div className="preview-head">
              <div className="preview-title">生成效果</div>
              {result?.transformSource ? (
                <div className="preview-badges">
                  <Tag color="purple">{result.transformSource}</Tag>
                  {result.ai?.model ? <Tag>{result.ai.model}</Tag> : null}
                </div>
              ) : null}
            </div>
            <div className="preview-content preview-content-fixed">
              {result ? (
                <div className="preview-modelBar">
                  <span className="preview-modelLabel">调用AI模型</span>
                  <span className="preview-modelValue">{getAiModelDisplay(result)}</span>
                </div>
              ) : null}

              {previewImage ? (
                <div className="preview-image-wrapper">
                  <img src={previewImage} alt="预览" className="preview-result-image" />
                </div>
              ) : (
                <div className="preview-placeholder">
                  <div className="placeholder-bg"></div>
                  <p className="placeholder-text">右侧会显示生成结果</p>
                </div>
              )}

              {loading ? (
                <div className="preview-loadingMask" aria-label="正在生成">
                  <div className="preview-loadingInner">
                    <Spin size="large" />
                    <div className="preview-loadingText">正在生成效果图…</div>
                    <div className="preview-loadingHint">模型需要一点时间来构图与渲染</div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* 发布作品弹窗 */}
      <Modal
        title="发布作品"
        open={artworkModalVisible}
        onCancel={() => {
          setArtworkModalVisible(false);
          artworkForm.resetFields();
        }}
        onOk={() => artworkForm.submit()}
        confirmLoading={saving}
        okText="发布"
        cancelText="取消"
        width={600}
      >
        <Form
          form={artworkForm}
          layout="vertical"
          onFinish={handleGenerateAndSave}
          initialValues={{
            publishToShop: false,
            price: 0
          }}
        >
          <Form.Item
            name="title"
            label="作品标题"
            rules={[{ required: true, message: '请输入作品标题' }]}
          >
            <Input placeholder="请输入作品标题" />
          </Form.Item>
          <Form.Item
            name="description"
            label="作品描述"
          >
            <TextArea rows={4} placeholder="请输入作品描述" />
          </Form.Item>
          <Form.Item
            name="publishToShop"
            valuePropName="checked"
            label="同时发布到商城"
          >
            <Switch checkedChildren="是" unCheckedChildren="否" />
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.publishToShop !== currentValues.publishToShop}
          >
            {({ getFieldValue }) =>
              getFieldValue('publishToShop') ? (
                <Form.Item
                  name="price"
                  label="商品价格（元）"
                  rules={[
                    { required: true, message: '请输入商品价格' },
                    { type: 'number', min: 0.01, message: '价格必须大于0' }
                  ]}
                >
                  <InputNumber
                    placeholder="请输入商品价格"
                    style={{ width: '100%' }}
                    min={0.01}
                    step={0.01}
                    precision={2}
                  />
                </Form.Item>
              ) : null
            }
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default Transform;
