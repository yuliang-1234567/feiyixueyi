import React from 'react';
import { Layout, Row, Col } from 'antd';
import { useNavigate } from 'react-router-dom';
import { MailOutlined, PhoneOutlined, EnvironmentOutlined } from '@ant-design/icons';
import './Footer.css';

const { Footer: AntFooter } = Layout;

const Footer = () => {
  const navigate = useNavigate();

  return (
    <AntFooter className="new-footer">
      <div className="footer-container">
        <Row gutter={[40, 40]} className="footer-content">
          {/* 第一列：品牌与描述 */}
          <Col xs={24} sm={12} md={6}>
            <div className="footer-brand">
              <div className="footer-logo">
                <span className="logo-icon">🎨</span>
                <span className="logo-text">非遗传承</span>
              </div>
              <p className="footer-description">
                致力于保护和传承非物质文化遗产，通过现代科技手段让传统技艺焕发新的生命力。
              </p>
            </div>
          </Col>

          {/* 第二列：核心模块 */}
          <Col xs={24} sm={12} md={6}>
            <h3 className="footer-title">核心模块</h3>
            <ul className="footer-links">
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/heritage-learn'); }}>学习非遗</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/learn'); }}>AI学艺</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/transform'); }}>数字焕新</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/gallery'); }}>大师作品库</a></li>
              <li><a href="#" onClick={(e) => { e.preventDefault(); navigate('/shop'); }}>文创商城</a></li>
            </ul>
          </Col>

          {/* 第三列：社区 */}
          <Col xs={24} sm={12} md={6}>
            <h3 className="footer-title">社区</h3>
            <ul className="footer-links">
              <li><a href="#">匠人入驻</a></li>
              <li><a href="#">教育合作</a></li>
              <li><a href="#">志愿者招募</a></li>
              <li><a href="#">活动中心</a></li>
            </ul>
          </Col>

          {/* 第四列：联系我们 */}
          <Col xs={24} sm={12} md={6}>
            <h3 className="footer-title">联系我们</h3>
            <ul className="footer-contact">
              <li>
                <MailOutlined className="contact-icon" />
                <span>13035397663@163.com</span>
              </li>
              <li>
                <PhoneOutlined className="contact-icon" />
                <span>13035397663</span>
              </li>
              <li>
                <EnvironmentOutlined className="contact-icon" />
                <span>湖北省武汉市</span>
              </li>
            </ul>
          </Col>
        </Row>

        {/* 底部版权信息 */}
        <div className="footer-bottom">
          <div className="footer-copyright">
            © 2026 非遗传承. 保留所有权利。
          </div>
          <div className="footer-legal">
            <a href="#">隐私政策</a>
            <span className="divider">|</span>
            <a href="#">服务条款</a>
            <span className="divider">|</span>
            <a href="#">Cookie政策</a>
          </div>
        </div>
      </div>

    </AntFooter>
  );
};

export default Footer;

