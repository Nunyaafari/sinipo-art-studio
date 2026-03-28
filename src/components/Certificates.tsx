import { useState, useEffect } from "react";
import { apiUrl, getNetworkErrorMessage } from "../lib/api";

interface Certificate {
  id: number;
  orderId: number;
  productId: number;
  productTitle: string;
  artist: string;
  purchaseDate: string;
  certificateNumber: string;
  authenticity: string;
  dimensions: string;
  medium: string;
  frame: string;
  edition: string;
  issuedAt: string;
}

interface CertificatesProps {
  onBack: () => void;
}

export default function Certificates({ onBack }: CertificatesProps) {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<number | null>(null);

  const token = localStorage.getItem('authToken');
  const API_BASE = apiUrl('/api/certificates');

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const response = await fetch(API_BASE, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setCertificates(data.data);
      } else {
        setError(data.error);
      }
    } catch (error) {
      console.error('Failed to fetch certificates:', error);
      setError(getNetworkErrorMessage(error, 'Failed to load certificates'));
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async (id: number) => {
    setDownloading(id);
    try {
      const response = await fetch(`${API_BASE}/${id}/download`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificate-${certificates.find(c => c.id === id)?.certificateNumber || 'download'}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to download certificate');
      }
    } catch (error) {
      console.error('Failed to download certificate:', error);
      setError(getNetworkErrorMessage(error, 'Failed to download certificate'));
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadImage = async (id: number) => {
    setDownloading(id);
    try {
      const response = await fetch(`${API_BASE}/${id}/image`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificate-${certificates.find(c => c.id === id)?.certificateNumber || 'download'}.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to download certificate image');
      }
    } catch (error) {
      console.error('Failed to download certificate image:', error);
      setError(getNetworkErrorMessage(error, 'Failed to download certificate image'));
    } finally {
      setDownloading(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafaf8] pt-28 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#c8a830] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading certificates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafaf8] pt-28">
      {/* Header */}
      <div className="bg-[#0a0a0a] py-16 px-6 text-center">
        <div
          className="text-[#c8a830] text-xs tracking-[0.4em] mb-4"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          CERTIFICATES OF AUTHENTICITY
        </div>
        <h1
          className="text-white text-5xl md:text-6xl font-light"
          style={{ fontFamily: "'Cormorant Garamond', serif" }}
        >
          My Certificates
        </h1>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10">
        {/* Back Button */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-xs tracking-[0.15em] text-gray-600 hover:text-[#c8a830] transition-colors mb-8"
          style={{ fontFamily: "'Montserrat', sans-serif" }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
          BACK TO PROFILE
        </button>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
            <button onClick={() => setError(null)} className="float-right text-red-500 hover:text-red-700">
              ×
            </button>
          </div>
        )}

        {/* Certificates List */}
        <div className="bg-white border border-gray-100 overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-100">
            <h2 className="text-2xl font-light text-[#0a0a0a]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
              Certificates ({certificates.length})
            </h2>
          </div>
          
          {certificates.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-200 mb-4">
                <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-400 text-lg" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                No certificates yet
              </p>
              <p className="text-gray-300 text-sm mt-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                Certificates will appear here after you purchase artworks
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {certificates.map((certificate) => (
                <div key={certificate.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-light text-[#0a0a0a]" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                          {certificate.productTitle}
                        </h3>
                        <span className="text-[10px] bg-green-100 text-green-800 px-2 py-1 rounded">
                          {certificate.authenticity}
                        </span>
                        {certificate.edition === "Limited Edition" && (
                          <span className="text-[10px] bg-[#c8a830] text-white px-2 py-1 rounded">
                            LIMITED EDITION
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                        by {certificate.artist}
                      </p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-500 mb-4" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                        <div>
                          <span className="block text-gray-400">Certificate No.</span>
                          <span className="font-mono">{certificate.certificateNumber}</span>
                        </div>
                        <div>
                          <span className="block text-gray-400">Dimensions</span>
                          <span>{certificate.dimensions}</span>
                        </div>
                        <div>
                          <span className="block text-gray-400">Medium</span>
                          <span>{certificate.medium}</span>
                        </div>
                        <div>
                          <span className="block text-gray-400">Frame</span>
                          <span>{certificate.frame}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-400" style={{ fontFamily: "'Montserrat', sans-serif" }}>
                        <span>Purchased: {formatDate(certificate.purchaseDate)}</span>
                        <span>Issued: {formatDate(certificate.issuedAt)}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      <button
                        onClick={() => handleDownloadPDF(certificate.id)}
                        disabled={downloading === certificate.id}
                        className="flex items-center gap-2 text-xs text-[#c8a830] hover:underline disabled:opacity-50"
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                      >
                        {downloading === certificate.id ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        )}
                        PDF
                      </button>
                      <button
                        onClick={() => handleDownloadImage(certificate.id)}
                        disabled={downloading === certificate.id}
                        className="flex items-center gap-2 text-xs text-gray-500 hover:underline disabled:opacity-50"
                        style={{ fontFamily: "'Montserrat', sans-serif" }}
                      >
                        {downloading === certificate.id ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        )}
                        IMAGE
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-[#c8a830]/10 p-6">
          <h3 className="text-sm tracking-[0.2em] text-[#c8a830] mb-3" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            ABOUT CERTIFICATES
          </h3>
          <ul className="text-sm text-gray-600 space-y-2" style={{ fontFamily: "'Montserrat', sans-serif" }}>
            <li>• Each certificate is uniquely numbered and verifiable</li>
            <li>• Certificates include artwork details, purchase date, and authenticity status</li>
            <li>• Download as PDF for printing or image for digital sharing</li>
            <li>• Certificates are automatically generated for all artwork purchases</li>
            <li>• Keep certificates safe as proof of authenticity for your collection</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
