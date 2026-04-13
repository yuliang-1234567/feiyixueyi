-- 为products表添加新字段（用于产品详情页）
-- 如果字段已存在，会报错但可以安全忽略

ALTER TABLE products ADD COLUMN material VARCHAR(200) COMMENT '材质';
ALTER TABLE products ADD COLUMN size VARCHAR(200) COMMENT '尺寸';
ALTER TABLE products ADD COLUMN origin VARCHAR(200) COMMENT '产地';
ALTER TABLE products ADD COLUMN craftsmanship TEXT COMMENT '工艺传承描述';
ALTER TABLE products ADD COLUMN culturalMeaning TEXT COMMENT '文化寓意描述';
