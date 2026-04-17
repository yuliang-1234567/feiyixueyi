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
  const [saving, setSaving] = useState(false);
  const [artworkModalVisible, setArtworkModalVisible] = useState(false);

  const isCustomStyle = styleKey === 'custom';
  const description = Form.useWatch('description', form) || '';
  const additionalDescription = Form.useWatch('additionalDescription', form) || '';
  const canGenerate = hasDrawing && String(description || '').trim() && !loading;
  const migrationState = location.state || {};

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
    }
  }, [form, migrationState]);

  const inferProductCategory = (text) => {
    const source = String(text || '');
    if (source.includes('手机壳')) return '手机壳';
    if (source.includes('T恤') || source.includes('t恤') || source.includes('tee')) return 'T恤';
    if (source.includes('帆布袋')) return '帆布袋';
    if (source.includes('明信片')) return '明信片';
    if (source.includes('马克杯') || source.includes('杯')) return '其他';
    return '其他';
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
      const productImageUrl = migrationState.sourceImageUrl
        ? getImageUrl(migrationState.sourceImageUrl)
        : String(canvasBackgroundUrl || '').trim();
      const payload = {
        sketchBase64,
        sketchLayerBase64,
        productImageUrl,
        styleKey,
        description: String(description || '').trim(),
        baseDescription: String(baseDescription || '').trim(),
        currentDescription: String(description || '').trim(),
        additionalDescription: String(additionalDescription || '').trim(),
        referenceImageUrl: migrationState.sourceImageUrl || '',
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

        <div className="heritage-card heritage-toolbarCard">
          <Form form={form} layout="vertical" requiredMark={false}>
            <div className="heritage-toolbarTop">
              <Form.Item
                name="description"
                label="产品描述"
                className="heritage-toolbarMainItem"
                rules={[{ required: true, message: '请输入产品描述' }]}
              >
                <TextArea
                  rows={2}
                  placeholder="例如：一个红色剪纸花纹的T恤、一个青花瓷花纹的木椅、一个丝线刺绣纹样的抱枕..."
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
                    <Button
                      onClick={() => {
                        if (!result?.transformedImageUrl) return;
                        const nextBg = getImageUrl(result.transformedImageUrl);
                        setCanvasBackgroundUrl(nextBg);
                        setPreviewImage('');
                        setResult(null);
                        form.setFieldsValue({ additionalDescription: '' });
                        message.success('已进入继续创作：生成图已作为新底图');
                      }}
                      className="heritage-continueBtn"
                    >
                      继续创作
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
            <Form.Item
              name="additionalDescription"
              label="追加修改（可选）"
              className="heritage-toolbarMainItem"
            >
              <TextArea
                rows={2}
                placeholder="例如：将笔墨当做树枝等符合场景的元素继续添加到T恤上；增强雪花纹样的天蓝色层次..."
              />
            </Form.Item>
            <div className="heritage-toolbarBottom">
              <div className="heritage-styleBlock">
                <div className="heritage-inlineLabel">非遗风格</div>
                <Select
                  value={styleKey}
                  onChange={(next) => {
                    setStyleKey(next);
                    setResult(null);
                  }}
                  options={styleOptions}
                  className="heritage-styleSelect"
                />
              </div>
              {styleKey === 'custom' ? (
                <div className="heritage-styleBlock heritage-styleBlockFlex">
                  <div className="heritage-inlineLabel">自定义风格</div>
                  <Input
                    value={customStylePrompt}
                    onChange={(e) => {
                      setCustomStylePrompt(e.target.value);
                      setResult(null);
                    }}
                    placeholder="例如：保留剪纸对称结构、增强手工质感、偏暖红金配色..."
                  />
                </div>
              ) : null}
              <div className="heritage-currentTag">
                <Tag color="purple">当前风格：{selectedStyleLabel}</Tag>
                {migrationState.sourceProductType ? <Tag>迁移来源：{migrationState.sourceProductType}</Tag> : null}
              </div>
            </div>
          </Form>
        </div>

        <div className="heritage-twoPane">
          <div className="heritage-leftPane">
            <div className="heritage-card">
              <div className="heritage-cardTitle">草图画布</div>
              <SketchCanvas
                ref={sketchRef}
                backgroundImageUrl={canvasBackgroundUrl}
                onHasDrawingChange={(v) => {
                  setHasDrawing(Boolean(v));
                }}
              />
            </div>
          </div>

          <div className="heritage-rightPane">
            <div className="heritage-card heritage-previewCard">
              <div className="heritage-previewHead">
                <div className="heritage-cardTitle">图片预览</div>
                {result?.transformSource ? (
                  <div className="heritage-previewTags">
                    <Tag color="purple">{result.transformSource}</Tag>
                    {result.ai?.model ? <Tag>{result.ai.model}</Tag> : null}
                  </div>
                ) : null}
              </div>
              <div className="heritage-previewBody">
                {result ? (
                  <div className="heritage-modelBar">
                    <span className="heritage-modelLabel">调用AI模型</span>
                    <span className="heritage-modelValue">{getAiModelDisplay(result)}</span>
                  </div>
                ) : null}

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

