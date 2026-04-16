import React from 'react';
import { Button, Empty, Image, message, Spin } from 'antd';
import { Download } from 'lucide-react';
import { getImageUrl } from '../utils/imageUtils';
import './ResultGallery.css';

async function downloadByUrl(url, filename) {
  const safeFilename = filename ? String(filename) : 'download.png';
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`下载失败: ${res.status}`);
  }
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = safeFilename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function ResultGallery({ results, loading }) {
  if (!results || results.length === 0) {
    return (
      <div className="resultGallery-empty">
        {loading ? (
          <div className="resultGallery-emptySpin">
            <Spin />
            <div className="resultGallery-emptyText">正在生成，请稍候…</div>
          </div>
        ) : (
          <>
            <Empty
              description="还没有生成结果"
              className="resultGallery-emptyAnt"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </>
        )}
      </div>
    );
  }

  return (
    <div className="resultGallery">
      {results.map((r) => {
        const imageUrlFull = getImageUrl(r.imageUrl);
        const filename = String(r.imageUrl || '').split('/').pop() || 'generated.png';

        return (
          <div key={r.id} className="resultCard">
            <div className="resultCardImage">
              <Image
                src={imageUrlFull}
                alt="生成结果"
                preview={{ mask: '点击放大查看' }}
              />
            </div>
            <div className="resultCardActions">
              <Button
                type="default"
                icon={<Download size={16} />}
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await downloadByUrl(imageUrlFull, filename);
                    message.success('下载成功');
                  } catch (err) {
                    console.error('下载失败:', err);
                    message.error('下载失败，请重试');
                  }
                }}
                className="resultCardDownloadBtn"
              >
                下载
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ResultGallery;

