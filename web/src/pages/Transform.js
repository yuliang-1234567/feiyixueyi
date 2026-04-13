import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Upload, message, Row, Col, Select, Input, Modal, Form, InputNumber, Switch, Typography } from 'antd';
import { UploadOutlined, ExperimentOutlined, SaveOutlined, ShoppingCartOutlined, SettingOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useAuthStore } from '../store/authStore';
import './Transform.css';

const { Option } = Select;
const { TextArea } = Input;
const { Text } = Typography;

// 预设纹样列表
const PRESET_PATTERNS = [
  { id: 'b1', name: '纹样1', path: '/images/ihchina/b1.png' },
  { id: 'b2', name: '纹样2', path: '/images/ihchina/b2.png' },
  { id: 'b3', name: '纹样3', path: '/images/ihchina/b3.png' },
  { id: 'b4', name: '纹样4', path: '/images/ihchina/b4.png' },
  { id: 'b5', name: '纹样5', path: '/images/ihchina/b5.png' },
  { id: 'b6', name: '纹样6', path: '/images/ihchina/b6.png' },
  { id: 'b7', name: '纹样7', path: '/images/ihchina/b7.png' },
  { id: 'b8', name: '纹样8', path: '/images/ihchina/b8.png' },
  { id: 'b9', name: '纹样9', path: '/images/ihchina/b9.png' },
  { id: 'b10', name: '纹样10', path: '/images/ihchina/b10.png' }
];

// 产品类型（对应后台样机与融合参数）
const PRODUCT_TYPES = ['T恤', '手机壳', '帆布袋', '明信片', '马克杯'];

const FILE_BY_TYPE = {
  'T恤': 'tshirt.png',
  '手机壳': 'phone-case.png',
  '帆布袋': 'bag.png',
  '明信片': 'postcard.png',
  '马克杯': 'mug.png',
};

const PRESET_PRODUCT_OPTIONS = PRODUCT_TYPES.map((type) => ({
  type,
  name: type,
  file: FILE_BY_TYPE[type] || 'default.png',
  imageUrl: ''
}));

function Transform() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [patternFile, setPatternFile] = useState(null);
  const [selectedPattern, setSelectedPattern] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState('手机壳');
  const [productFile, setProductFile] = useState(null); // 上传的产品底图，与「选择产品」二选一
  const [productTemplates, setProductTemplates] = useState({ directory: '', directoryNote: '', templates: [] });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [artworkModalVisible, setArtworkModalVisible] = useState(false);
  const [productForm] = Form.useForm();
  const [artworkForm] = Form.useForm();
  const [previewImage, setPreviewImage] = useState(null);
  const previewRef = useRef(null);

  const { user } = useAuthStore();

  // 加载预设产品列表（含引用目录说明）
  useEffect(() => {
    api.get('/ai/product-templates')
      .then((res) => {
        if (res.data.success && res.data.data) {
          setProductTemplates(res.data.data);
        }
      })
      .catch(() => {});
  }, []);


  // 处理预设纹样选择
  const handleSelectPattern = async (pattern) => {
    try {
      setSelectedPattern(pattern);
      setPatternFile(null);
      setCurrentStep(2);
      
      const response = await fetch(`${process.env.PUBLIC_URL || ''}${pattern.path}`);
      const blob = await response.blob();
      const file = new File([blob], `${pattern.id}.png`, { type: 'image/png' });
      setPatternFile(file);
      message.success(`已选择${pattern.name}`);
    } catch (error) {
      console.error('加载预设纹样失败:', error);
      message.error('加载纹样失败');
    }
  };

  // 处理上传纹样
  const handleUploadPattern = (file) => {
    setPatternFile(file);
    setSelectedPattern(null);
    setCurrentStep(2);
    message.success('纹样上传成功');
  };

  // 选择预设产品（使用后台样机底图）
  const handleSelectProduct = (productType) => {
    setSelectedProduct(productType);
    setProductFile(null);
    setCurrentStep(3);
  };

  // 上传产品底图（使用自定义图片作为底图）
  const handleUploadProduct = (file) => {
    setProductFile(file);
    setSelectedProduct('其他'); // 融合参数用「其他」
    setCurrentStep(3);
    message.success('已选择产品底图');
  };

  // 生成预览（后台算法融合纹样与产品样机）
  const handleGeneratePreview = async () => {
    const hasPattern = !!patternFile || !!selectedPattern;
    if (!hasPattern) {
      message.warning('请上传或选择纹样图片，算法融合需要纹样与产品样机');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      let finalPatternFile = patternFile;
      if (selectedPattern && !patternFile) {
        const response = await fetch(`${process.env.PUBLIC_URL || ''}${selectedPattern.path}`);
        const blob = await response.blob();
        finalPatternFile = new File([blob], `${selectedPattern.id}.png`, { type: 'image/png' });
      }
      formData.append('pattern', finalPatternFile);
      if (productFile) {
        formData.append('product', productFile);
        formData.append('productType', selectedProduct);
      } else {
        formData.append('productType', selectedProduct);
      }

      const response = await api.post('/ai/transform', formData, {
        timeout: 60000,
      });

      if (response.data.success) {
        const data = response.data.data;
        setResult(data);
        const baseUrl = process.env.REACT_APP_API_URL;
        const uploadBase = baseUrl.replace(/\/api\/?$/, '');
        setPreviewImage(`${uploadBase}${data.transformedImageUrl}`);
        message.success('预览生成成功！');
        setTimeout(() => {
          previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 300);
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
      const apiBase = process.env.REACT_APP_API_URL;
      const uploadBase = apiBase.replace(/\/api\/?$/, '');
      const imageResponse = await fetch(`${uploadBase}${result.transformedImageUrl}`);
      const blob = await imageResponse.blob();
      const file = new File([blob], 'transformed.png', { type: 'image/png' });

      const formData = new FormData();
      formData.append('image', file);
      formData.append('title', values.title || `数字焕新作品 - ${selectedProduct}`);
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
            const productCategory = categoryMap[selectedProduct] || '其他';

            const productData = {
              name: values.title || `数字焕新作品 - ${selectedProduct}`,
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
      {/* 页面标题 */}
      <div className="transform-header">
        <h1 className="transform-title">数字焕新 - 传统文化的数字化重生</h1>
        <p className="transform-subtitle">
          探索非物质文化遗产在数字时代的创新演绎，体验古老技艺与现代科技的融合
        </p>
      </div>

      <div className="transform-container">
        {/* 步骤横向展示 */}
        <Row gutter={[20, 20]} className="steps-row">
          {/* 第一步：上传纹样 */}
          <Col xs={24} sm={24} md={8}>
            <div className={`step-panel step-1 ${currentStep >= 1 ? 'active' : ''}`}>
                <div className="step-banner">
                  <div className="step-banner-top"></div>
                  <h3 className="step-title">第一步: 上传纹样</h3>
                  <div className="step-banner-bottom"></div>
                </div>
                <div className="step-content">
                  {currentStep >= 1 && (
                    <>
                      {/* 预设纹样选择 */}
                      <div className="preset-patterns">
                        {PRESET_PATTERNS.map((pattern) => (
                          <div
                            key={pattern.id}
                            className={`preset-pattern-item ${selectedPattern?.id === pattern.id ? 'selected' : ''}`}
                            onClick={() => handleSelectPattern(pattern)}
                          >
                            <img
                              src={`${process.env.PUBLIC_URL || ''}${pattern.path}`}
                              alt={pattern.name}
                              className="preset-pattern-image"
                            />
                            {selectedPattern?.id === pattern.id && (
                              <CheckCircleOutlined className="check-icon" />
                            )}
                          </div>
                        ))}
                      </div>

                      <div className="skip-pattern">
                        <Button type="link" onClick={() => setCurrentStep(2)}>
                          下一步：选择产品类型（生成需先上传或选择纹样）
                        </Button>
                      </div>
                      {/* 或上传自定义纹样 */}
                      <div className="upload-section">
                        <Upload
                          beforeUpload={(file) => {
                            const isImage = file.type.startsWith('image/');
                            if (!isImage) {
                              message.error('只能上传图片文件！');
                              return false;
                            }
                            handleUploadPattern(file);
                            return false;
                          }}
                          showUploadList={false}
                          accept="image/*"
                        >
                          <div className="upload-zone">
                            <div className="upload-icon-wrapper">
                              <span className="brush-icon">🖋️</span>
                            </div>
                            <p className="upload-text">点击或拖拽文件至此上传纹样</p>
                            <p className="upload-hint">支持 PNG, JPG格式</p>
                          </div>
                        </Upload>
                        {patternFile && (
                          <div className="uploaded-pattern">
                            <CheckCircleOutlined className="check-icon" />
                            <span>{patternFile.name}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
            </div>
          </Col>

          {/* 第二步：选择产品或上传产品底图 */}
          <Col xs={24} sm={24} md={8}>
            <div className={`step-panel step-2 ${currentStep >= 2 ? 'active' : ''}`}>
              <div className="step-banner">
                <div className="step-banner-top"></div>
                <h3 className="step-title">第二步: 选择或上传产品底图</h3>
                <div className="step-banner-bottom"></div>
              </div>
              <div className="step-content">
                {currentStep >= 2 && (
                  <>
                    <p className="step-hint">选择预设产品将使用对应样机图作为底图；上传产品则使用您上传的图片作为底图，再与纹样融合生成。</p>
                    {/* 引用资源目录说明 */}
                    <div className="product-templates-dir">
                      <strong>预设产品底图引用目录：</strong>
                      <code>{productTemplates.directory || 'backend/uploads/product-templates'}</code>
                      <p className="dir-note">{productTemplates.directoryNote || '将对应文件名图片放入该目录即可作为「选择产品」的底图'}</p>
                      <ul className="template-files-list">
                        {(productTemplates.templates && productTemplates.templates.length > 0)
                          ? productTemplates.templates.map((t) => (
                              <li key={t.type}><code>{t.file}</code>（{t.name}）</li>
                            ))
                          : PRESET_PRODUCT_OPTIONS.map((t) => (
                              <li key={t.type}><code>{t.file}</code>（{t.name}）</li>
                            ))
                        }
                      </ul>
                    </div>
                    {/* 选择产品：预设样机列表 */}
                    <div className="product-select-section">
                      <span className="product-type-label">选择产品：</span>
                      <div className="preset-products">
                        {(productTemplates.templates && productTemplates.templates.length > 0
                          ? productTemplates.templates
                          : PRESET_PRODUCT_OPTIONS
                        ).map((t) => {
                          const imageUrl = t.imageUrl || (process.env.REACT_APP_API_URL || '').replace(/\/api\/?$/, '') + '/uploads/product-templates/' + t.file;
                          return (
                            <div
                              key={t.type}
                              className={`preset-product-item ${!productFile && selectedProduct === t.type ? 'selected' : ''}`}
                              onClick={() => handleSelectProduct(t.type)}
                            >
                              <div className="preset-product-image-wrap">
                                <img src={imageUrl} alt={t.name} className="preset-product-image" onError={(e) => { e.target.style.display = 'none'; }} />
                              </div>
                              <span className="preset-product-name">{t.name}</span>
                              {!productFile && selectedProduct === t.type && <CheckCircleOutlined className="check-icon" />}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                    {/* 上传产品底图 */}
                    <div className="product-upload-section">
                      <span className="product-type-label">或上传产品底图：</span>
                      <Upload
                        beforeUpload={(file) => {
                          if (!file.type.startsWith('image/')) {
                            message.error('只能上传图片');
                            return false;
                          }
                          handleUploadProduct(file);
                          return false;
                        }}
                        showUploadList={false}
                        accept="image/*"
                      >
                        <div className="upload-zone upload-zone-product">
                          <UploadOutlined className="upload-icon" />
                          <p className="upload-text">点击上传产品底图</p>
                          <p className="upload-hint">支持 PNG、JPG，将作为融合底图</p>
                        </div>
                      </Upload>
                      {productFile && (
                        <div className="uploaded-product">
                          <CheckCircleOutlined className="check-icon" />
                          <span>{productFile.name}</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </Col>

          {/* 第三步：生成 */}
          <Col xs={24} sm={24} md={8}>
            <div className={`step-panel step-3 ${currentStep >= 2 ? 'active' : ''}`}>
              <div className="step-banner">
                <div className="step-banner-top"></div>
                <h3 className="step-title">第三步: 生成</h3>
                <div className="step-banner-bottom"></div>
              </div>
              <div className="step-content">
                {currentStep >= 2 && (
                  <div className="generate-tips">
                    <p>使用后台算法将纹样融合到产品样机上</p>
                    <ul>
                      <li>选择或上传纹样后，选择产品类型即可生成</li>
                      <li>纹样将按产品形状与位置自动贴合</li>
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </Col>
        </Row>

        {/* 预览区域 - 显示在步骤下方 */}
        <div ref={previewRef} className="preview-section">
          <Row gutter={[40, 40]}>
            <Col xs={24} lg={16}>
              <div className="preview-panel">
                <div className="preview-frame">
                  <div className="preview-title">焕然一新预览</div>
                  <div className="preview-content">
                    {previewImage ? (
                      <div className="preview-image-wrapper">
                        <img src={previewImage} alt="预览" className="preview-result-image" />
                      </div>
                    ) : (
                      <div className="preview-placeholder">
                        <div className="placeholder-bg"></div>
                        <p className="placeholder-text">预览将在此显示</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Col>
            <Col xs={24} lg={8}>
              <div className="preview-actions">
                {/* 生成按钮 */}
                <Button
                  type="primary"
                  size="large"
                  icon={<ExperimentOutlined />}
                  loading={loading}
                  onClick={handleGeneratePreview}
                  className="generate-btn"
                  disabled={!patternFile && !selectedPattern}
                  block
                >
                  生成预览
                </Button>

                {/* 生成并保存按钮 */}
                {result && (
                  <Button
                    type="primary"
                    size="large"
                    icon={<SaveOutlined />}
                    loading={saving}
                    onClick={() => setArtworkModalVisible(true)}
                    className="save-btn"
                    block
                  >
                    生成并保存
                  </Button>
                )}
              </div>
            </Col>
          </Row>
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
