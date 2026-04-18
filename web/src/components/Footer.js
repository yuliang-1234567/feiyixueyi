import React from 'react';
import { Layout, Row, Col } from 'antd';
import { useNavigate } from 'react-router-dom';
import { Mail, MapPin, Palette, Phone } from "lucide-react";
import './Footer.css';
import { LucideIcon } from "./icons/lucide";

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
                <span className="logo-icon" aria-hidden="true">
                  <LucideIcon icon={Palette} size={28} strokeWidth={1.6} />
                </span>
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
              <li><button type="button" className="footer-link-button" onClick={() => navigate('/heritage-learn')}>学习非遗</button></li>
              <li><button type="button" className="footer-link-button" onClick={() => navigate('/learn')}>AI学艺</button></li>
              <li><button type="button" className="footer-link-button" onClick={() => navigate('/transform')}>数字焕新</button></li>
              <li><button type="button" className="footer-link-button" onClick={() => navigate('/gallery')}>大师作品库</button></li>
              <li><button type="button" className="footer-link-button" onClick={() => navigate('/shop')}>文创商城</button></li>
            </ul>
          </Col>

          {/* 第三列：社区 */}
          <Col xs={24} sm={12} md={6}>
            <h3 className="footer-title">社区</h3>
            <ul className="footer-links">
              <li><button type="button" className="footer-link-button footer-link-muted" aria-disabled="true">匠人入驻</button></li>
              <li><button type="button" className="footer-link-button footer-link-muted" aria-disabled="true">教育合作</button></li>
              <li><button type="button" className="footer-link-button footer-link-muted" aria-disabled="true">志愿者招募</button></li>
              <li><button type="button" className="footer-link-button footer-link-muted" aria-disabled="true">活动中心</button></li>
            </ul>
          </Col>

          {/* 第四列：联系我们 */}
          <Col xs={24} sm={12} md={6}>
            <h3 className="footer-title">联系我们</h3>
            <ul className="footer-contact">
              <li>
                <LucideIcon icon={Mail} className="contact-icon" />
                <span>13035397663@163.com</span>
              </li>
              <li>
                <LucideIcon icon={Phone} className="contact-icon" />
                <span>13035397663</span>
              </li>
              <li>
                <LucideIcon icon={MapPin} className="contact-icon" />
                <span>湖北省武汉市</span>
              </li>
              <li className="footer-qrRow">
                  <img
                    className="footer-qrImage"
                    src={`${process.env.PUBLIC_URL || ''}/images/miniapp-qr.png`}
                    alt="小程序二维码"
                    loading="lazy"
                  />
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
            <button type="button" className="footer-link-button footer-link-muted" aria-disabled="true">隐私政策</button>
            <span className="divider">|</span>
            <button type="button" className="footer-link-button footer-link-muted" aria-disabled="true">服务条款</button>
            <span className="divider">|</span>
            <button type="button" className="footer-link-button footer-link-muted" aria-disabled="true">Cookie政策</button>
          </div>
        </div>
      </div>

    </AntFooter>
  );
};

export default Footer;

