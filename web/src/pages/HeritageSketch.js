import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Form, Input, InputNumber, Modal, Select, Spin, Switch, Tag, message } from 'antd';
import { Save, Wand2 } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import SketchCanvas from '../components/SketchCanvas';
import { getImageUrl } from '../utils/imageUtils';
import { buildOptions, fetchStyleSystem } from '../utils/styleSystem';
import { LucideIcon } from '../components/icons/lucide';
import './HeritageSketch.css';

const { TextArea } = Input;

function HeritageSketch() {
  const navigate = useNavigate();
  const location = useLocation();
  const sketchRef = useRef(null);
  const [form] = Form.useForm();
  const [artworkForm] = Form.useForm();

  const migrationState = useMemo(() => location.state || {}, [location.state]);

  const [hasDrawing, setHasDrawing] = useState(false);
  const [styleKey, setStyleKey] = useState('paper-cutting');
  const [customStylePrompt, setCustomStylePrompt] = useState('');
  const [styleOptions, setStyleOptions] = useState([
    { value: 'paper-cutting', label: '剪纸' },
    { value: 'blue-white-porcelain', label: '青花瓷' },
    { value: 'embroidery', label: '刺绣' },
    { value: 'custom', label: '自定义' },
  ]);

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [previewImage, setPreviewImage] = useState('');
  const [canvasBackgroundUrl, setCanvasBackgroundUrl] = useState('');
  const [baseDescription, setBaseDescription] = useState('');
  /** 仅迁移自数字焕新后展示「追加修改」 */
  const [showAdditionalEdit, setShowAdditionalEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [artworkModalVisible, setArtworkModalVisible] = useState(false);

  const isCustomStyle = styleKey === 'custom';
  const description = Form.useWatch('description', form) || '';
  const additionalDescription = Form.useWatch('additionalDescription', form) || '';
  const canGenerate = hasDrawing && String(description || '').trim() && !loading;

  const selectedStyleLabel = useMemo(() => {
    return styleOptions.find((s) => s.value === styleKey)?.label || '自定义';
  }, [styleKey, styleOptions]);

  useEffect(() => {
    let mounted = true;
    fetchStyleSystem({ scene: 'heritage-sketch' })
      .then((data) => {
        if (!mounted || !data?.styles) return;
        const options = buildOptions(data.styles);
        if (options.length) setStyleOptions(options);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!migrationState) return;
    if (migrationState.sourceDescription) {
      form.setFieldsValue({ description: migrationState.sourceDescription });
      setBaseDescription(migrationState.sourceDescription);
    }
    if (migrationState.sourceStylePrompt) {
      setCustomStylePrompt(String(migrationState.sourceStylePrompt || ''));
      setStyleKey('custom');
    }
    if (migrationState.sourceImageUrl) {
      setCanvasBackgroundUrl(getImageUrl(migrationState.sourceImageUrl));
      setShowAdditionalEdit(true);
    }
  }, [form, migrationState]);

  const handleResetAll = () => {
    if (loading || saving) return;

    // 清空表单与页面状态
    form.resetFields();
    setStyleKey('paper-cutting');
    setCustomStylePrompt('');
    setHasDrawing(false);
    setResult(null);
    setPreviewImage('');
    setCanvasBackgroundUrl('');
    setBaseDescription('');
    setShowAdditionalEdit(false);

    // 清空画布笔触
    sketchRef.current?.clear?.();

    // 关闭发布弹窗并清空发布表单
    setArtworkModalVisible(false);
    artworkForm.resetFields();

    // 清空迁移 state，避免重置后又被回填
    navigate('/heritage-sketch', { replace: true, state: {} });

    message.success('已重置：描述/风格/草图/底图/结果已清空');
  };

  const inferProductCategory = (text) => {
    const source = String(text || '');
    if (source.includes('手机壳')) return '手机壳';
    if (source.includes('T恤') || source.includes('t恤') || source.includes('tee')) return 'T恤';
    if (source.includes('帆布袋')) return '帆布袋';
    if (source.includes('明信片')) return '明信片';
    if (source.includes('马克杯') || source.includes('杯')) return '其他';
    return '其他';
  };

  const handleGenerate = async () => {
    if (!sketchRef.current) {
      message.warning('画布尚未就绪，请稍后再试');
      return;
    }
    if (!hasDrawing) {
      message.warning('请先在左侧画布完成草图，再点击生成');
      return;
    }

    const sketchBase64 = sketchRef.current.exportBase64?.(); // 组合图（底图+笔触），用于兜底
    const sketchLayerBase64 = sketchRef.current.exportStrokesBase64?.(); // 透明笔触层，用于“两图合成”
    if (!sketchLayerBase64) {
      message.error('导出笔触层失败，请重试');
      return;
    }

    setLoading(true);
    try {
      // 仅迁移后画布有产品底图时，才传 productImageUrl，走后端双图合成；首次空白画布只传笔触层
      const hasProductBase = Boolean(String(canvasBackgroundUrl || '').trim());
      const payload = {
        sketchBase64,
        sketchLayerBase64,
        styleKey,
        description: String(description || '').trim(),
        baseDescription: String(baseDescription || '').trim(),
        currentDescription: String(description || '').trim(),
        additionalDescription: String(additionalDescription || '').trim(),
        ...(hasProductBase
          ? {
              productImageUrl: String(canvasBackgroundUrl).trim(),
              referenceImageUrl: migrationState.sourceImageUrl || '',
            }
          : {}),
        ...(isCustomStyle ? { customStylePrompt: String(customStylePrompt || '').trim() } : {}),
      };

      const response = await api.post('/ai/heritage-sketch-generate', payload, { timeout: 120000 });
      if (!response?.data?.success) {
        message.error(response?.data?.message || '生成失败，请稍后重试');
        return;
      }

      const data = response.data.data;
      setResult(data);
      setPreviewImage(getImageUrl(data.transformedImageUrl));

      message.success('生成成功！');
    } catch (error) {
      console.error('生成失败:', error);
      const errMsg = error?.response?.data?.message || error.message || '生成失败，请重试';
      message.error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAndSave = async (values) => {
    if (!result?.transformedImageUrl) {
      message.warning('请先生成效果图');
      return;
    }

    setSaving(true);
    try {
      const imageResponse = await fetch(getImageUrl(result.transformedImageUrl));
      const blob = await imageResponse.blob();
      const file = new File([blob], 'heritage-sketch.png', { type: 'image/png' });

      const formData = new FormData();
      formData.append('image', file);
      formData.append('title', values.title || '一笔成纹作品');
      formData.append('description', values.description || String(description || '').trim() || '通过一笔成纹功能生成的非遗产品图');
      formData.append('category', '其他');
      formData.append('tags', '一笔成纹,非遗,草图生成');
      formData.append('status', 'published');

      const response = await api.post('/artworks', formData);

      if (!response.data.success) {
        message.error(response.data.message || '保存失败');
        return;
      }

      const artwork = response.data.data.artwork;
      const artworkImageUrl = artwork.imageUrl;

      if (values.publishToShop) {
        if (!values.price || values.price <= 0) {
          message.error('发布到商城需要设置价格');
          return;
        }

        const productData = {
          name: values.title || '一笔成纹作品',
          description: values.description || String(description || '').trim() || '通过一笔成纹功能生成的非遗产品图',
          images: [artworkImageUrl],
          price: parseFloat(values.price),
          category: inferProductCategory(description),
          patternId: artwork.id,
          status: 'published',
          stock: 999,
        };

        const productResponse = await api.post('/products', productData);
        if (productResponse.data.success) {
          message.success('作品和商品发布成功！');
          setArtworkModalVisible(false);
          artworkForm.resetFields();
          navigate('/shop');
        } else {
          message.warning(`作品保存成功，但发布到商城失败：${productResponse.data.message || '未知错误'}`);
        }
      } else {
        message.success('作品保存成功！');
        setArtworkModalVisible(false);
        artworkForm.resetFields();
        navigate(`/artworks/${artwork.id}`);
      }
    } catch (error) {
      console.error('保存失败:', error);
      message.error(error?.response?.data?.message || '保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="heritage-sketch-page">
      <div className="heritage-sketch-container">
        <div className="heritage-sketch-header">
          <h1 className="heritage-sketch-title">一笔成纹</h1>
          <p className="heritage-sketch-subtitle">
            在左侧画板改稿，在右侧实时参考/查看产品图；你可以自由描述一个产品，例如红色剪纸花纹的T恤、青花瓷花纹的木椅。
          </p>
        </div>

        <div className="heritage-card heritage-toolbarCard heritage-toolbarCard--compact">
          <Form form={form} layout="vertical" size="small" requiredMark={false} className="heritage-toolbarForm">
            <div className="heritage-toolbarTop">
              <Form.Item
                name="description"
                label="产品描述"
                className="heritage-toolbarMainItem"
                rules={[{ required: true, message: '请输入产品描述' }]}
              >
                <TextArea
                  rows={2}
                  autoSize={{ minRows: 2, maxRows: 4 }}
                  placeholder="例如：青花瓷纹样木椅、红色剪纸T恤..."
                />
              </Form.Item>
              <div className="heritage-toolbarActions">
                <Button
                  type="primary"
                  icon={<LucideIcon icon={Wand2} />}
                  loading={loading}
                  disabled={!canGenerate}
                  onClick={handleGenerate}
                  className="heritage-generateBtn"
                >
                  生成效果
                </Button>
                <Button
                  danger
                  disabled={loading || saving}
                  onClick={handleResetAll}
                  className="heritage-resetBtn"
                >
                  重置
                </Button>
                {result ? (
                  <>
                    <Button
                      icon={<LucideIcon icon={Save} />}
                      loading={saving}
                      onClick={() => setArtworkModalVisible(true)}
                      className="heritage-saveBtn"
                    >
                      保存/发布
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
            {showAdditionalEdit ? (
              <Form.Item
                name="additionalDescription"
                label="追加修改（可选）"
                className="heritage-toolbarMainItem heritage-additionalItem"
              >
                <TextArea
                  rows={2}
                  autoSize={{ minRows: 2, maxRows: 4 }}
                  placeholder="在迁移后补充修改意图…"
                />
              </Form.Item>
            ) : null}
            <div className="heritage-toolbarBottom">
              <div className="heritage-styleBlock">
                <span className="heritage-inlineLabel">非遗风格</span>
                <Select
                  value={styleKey}
                  onChange={(next) => {
                    setStyleKey(next);
                    setResult(null);
                  }}
                  options={styleOptions}
                  className="heritage-styleSelect"
                  size="middle"
                />
              </div>
              {styleKey === 'custom' ? (
                <div className="heritage-styleBlock heritage-styleBlockFlex">
                  <span className="heritage-inlineLabel">自定义</span>
                  <Input
                    value={customStylePrompt}
                    onChange={(e) => {
                      setCustomStylePrompt(e.target.value);
                      setResult(null);
                    }}
                    placeholder="风格补充…"
                    size="middle"
                  />
                </div>
              ) : null}
              <div className="heritage-currentTag">
                <Tag color="purple">{selectedStyleLabel}</Tag>
                {migrationState.sourceProductType ? <Tag>迁移：{migrationState.sourceProductType}</Tag> : null}
              </div>
            </div>
          </Form>
        </div>

        <div className="heritage-twoPane">
          <div className="heritage-leftPane">
            <div className="heritage-card heritage-paneCard">
              <div className="heritage-cardTitle">草图画布</div>
              <div className="heritage-visualSlot">
                <SketchCanvas
                  ref={sketchRef}
                  backgroundImageUrl={canvasBackgroundUrl}
                  onHasDrawingChange={(v) => {
                    setHasDrawing(Boolean(v));
                  }}
                />
              </div>
            </div>
          </div>

          <div className="heritage-rightPane">
            <div className="heritage-card heritage-previewCard heritage-paneCard">
              <div className="heritage-previewHead">
                <div className="heritage-cardTitle">图片预览</div>
                {result?.transformSource === 'ai' ? (
                  <div className="heritage-previewTags">
                    <Tag color="green">已生成</Tag>
                  </div>
                ) : null}
              </div>
              <div className="heritage-previewBody">
                {previewImage ? (
                  <div className="heritage-previewImageWrap">
                    <img src={previewImage} alt="效果预览" className="heritage-previewImage" />
                  </div>
                ) : (
                  <div className="heritage-previewPlaceholder">
                    <div className="heritage-previewPlaceholderInner">
                      先从数字焕新迁移一张产品图到底图画布，或直接在空白画布上改稿；生成后右侧展示效果图。
                    </div>
                  </div>
                )}
                {loading ? (
                  <div className="heritage-previewLoading">
                    <Spin size="large" />
                    <div className="heritage-previewLoadingText">正在根据草稿与描述生成效果图…</div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

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
            title: '一笔成纹作品',
            description: String(description || '').trim(),
            publishToShop: false,
            price: 0,
          }}
        >
          <Form.Item
            name="title"
            label="作品标题"
            rules={[{ required: true, message: '请输入作品标题' }]}
          >
            <Input placeholder="请输入作品标题" />
          </Form.Item>
          <Form.Item name="description" label="作品描述">
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
                    { type: 'number', min: 0.01, message: '价格必须大于0' },
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

export default HeritageSketch;

