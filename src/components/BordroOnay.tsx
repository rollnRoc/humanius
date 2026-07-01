import React, { useState, useRef } from 'react';
import { ShieldCheck, Upload, PenTool, Key, X } from 'lucide-react';
import { bordroService } from '../services/bordroService';

interface SignaturePadProps {
  onSign: (signature: string) => void;
}

function SignaturePad({ onSign }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#1e293b';
      }
    }
  }, []);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.beginPath();
      onSign(canvas.toDataURL());
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        let x, y;
        if ('touches' in e) {
          x = e.touches[0].clientX - rect.left;
          y = e.touches[0].clientY - rect.top;
        } else {
          x = e.clientX - rect.left;
          y = e.clientY - rect.top;
        }
        ctx.lineTo(x, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x, y);
      }
    }
  };

  const clear = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
      }
      onSign('');
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="border-2 border-dashed border-slate-300 rounded-xl overflow-hidden bg-white shadow-inner">
        <canvas
          ref={canvasRef}
          width={400}
          height={200}
          onMouseDown={startDrawing}
          onMouseUp={stopDrawing}
          onMouseOut={stopDrawing}
          onMouseMove={draw}
          onTouchStart={startDrawing}
          onTouchEnd={stopDrawing}
          onTouchMove={draw}
          className="touch-none cursor-crosshair max-w-full"
        />
      </div>
      <button
        type="button"
        onClick={clear}
        className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors px-3 py-1 rounded-md hover:bg-slate-100"
      >
        Temizle
      </button>
    </div>
  );
}

interface BordroOnayProps {
  bordro: any;
  employeeId: string;
  employeeName: string;
  initialShowModal?: boolean;
  onApprovalComplete?: () => void;
}

const BordroOnay: React.FC<BordroOnayProps> = ({
  bordro,
  employeeId,
  employeeName,
  initialShowModal = false,
  onApprovalComplete
}) => {
  const [showModal, setShowModal] = useState(initialShowModal);
  const [verificationMethod, setVerificationMethod] = useState<'passcode'>('passcode');
  const [signatureData, setSignatureData] = useState('');
  const [idDocumentData, setIdDocumentData] = useState('');
  const [passcodeData, setPasscodeData] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleIdUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setIdDocumentData(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (verificationMethod === 'signature' && !signatureData) {
      setError('Lütfen imzanızı atın.');
      return;
    }
    if (verificationMethod === 'id_document' && !idDocumentData) {
      setError('Lütfen kimlik belgenizi yükleyin.');
      return;
    }
    if (verificationMethod === 'passcode' && !passcodeData) {
      setError('Lütfen onay şifrenizi girin.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (verificationMethod === 'passcode') {
        const isValid = await bordroService.verifyEmployeePasscode(employeeId, passcodeData);
        if (!isValid) {
          setError('Geçersiz şifre. Lütfen yöneticinizden aldığınız şifreyi girin.');
          setIsSubmitting(false);
          return;
        }
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const bordroIdIsValid = uuidRegex.test(bordro.id);

      if (bordroIdIsValid) {
        const approval = {
          bordro_id: bordro.id,
          company_id: bordro.company_id,
          employee_id: employeeId,
          employee_name: employeeName,
          verification_method: verificationMethod,
          signature_data: verificationMethod === 'signature' ? signatureData : undefined,
          id_document_data: verificationMethod === 'id_document' ? idDocumentData : undefined,
          passcode_hash: verificationMethod === 'passcode' ? passcodeData : undefined,
          approval_status: 'onaylandi' as const,
          ip_address: '',
          user_agent: navigator.userAgent
        };

        await bordroService.createApproval(approval);
      }

      setShowModal(false);
      if (onApprovalComplete) {
        onApprovalComplete();
      }
    } catch (err: any) {
      setError(err?.message || 'Onay kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showModal) {
    return (
      <div className="border-t border-gray-200 pt-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="bg-blue-100 rounded-full p-3">
                <ShieldCheck className="w-8 h-8 text-blue-600" />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-blue-900 mb-2 flex items-center gap-2">
                Güvenli Bordro Onayı
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Şifreli Doğrulama
                </span>
              </h3>
              <p className="text-sm text-blue-700 mb-4">
                Bordronuzu güvenli bir şekilde onaylamak için aşağıdaki butona tıklayın. Bordronuzu kişisel şifrenizle güvenle onaylayabilirsiniz:
              </p>

              <div className="grid grid-cols-1 gap-3 mb-4">
                

                <div className="bg-white/60 rounded-lg p-3 border border-blue-200">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="bg-blue-100 rounded p-1">
                      <Key className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-xs font-semibold text-blue-900">Şifre Doğrulama</span>
                  </div>
                  <p className="text-xs text-blue-600">Kişisel şifrenizi girin</p>
                </div>
              </div>

              <button
                onClick={() => setShowModal(true)}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-semibold transition-all shadow-md hover:shadow-lg transform hover:scale-[1.02]"
              >
                <ShieldCheck className="w-5 h-5" />
                Bordroyu Onayla
              </button>

              <div className="mt-3 flex items-center justify-center gap-2 text-xs text-blue-600">
                <ShieldCheck className="w-4 h-4" />
                <span className="font-medium">Zaman damgalı ve güvenli kayıt sistemi</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-6 h-6" />
            <h2 className="text-xl font-semibold">Bordro Onayı</h2>
          </div>
          <button
            onClick={() => setShowModal(false)}
            className="p-1 rounded-lg hover:bg-white/20 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Dönem:</strong> {bordro.period}
            </p>
            <p className="text-sm text-blue-800 mt-1">
              <strong>Onaylayan:</strong> {employeeName}
            </p>
            <p className="text-sm text-blue-800 mt-1">
              <strong>Net Maaş:</strong> {bordro.net_maas?.toLocaleString('tr-TR')} ₺
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
              <X className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="mt-6 p-6 bg-slate-50 border border-slate-200 rounded-xl">
                {verificationMethod === 'signature' ? (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700 text-center">
                      Lütfen aşağıdaki alana imzanızı atın
                    </label>
                    <SignaturePad onSign={setSignatureData} />
                  </div>
                ) : verificationMethod === 'id_document' ? (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700">
                      Kimlik Belgesi Fotoğrafı
                    </label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-lg bg-white">
                      <div className="space-y-1 text-center">
                        {idDocumentData ? (
                          <div className="flex flex-col items-center">
                            <img src={idDocumentData} alt="Kimlik" className="h-32 object-contain mb-4 rounded" />
                            <button
                              type="button"
                              onClick={() => setIdDocumentData('')}
                              className="text-sm text-red-600 hover:text-red-800 font-medium"
                            >
                              Farklı bir dosya seç
                            </button>
                          </div>
                        ) : (
                          <>
                            <Upload className="mx-auto h-12 w-12 text-slate-400" />
                            <div className="flex text-sm text-slate-600 justify-center">
                              <label
                                htmlFor="file-upload"
                                className="relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none"
                              >
                                <span>Dosya Yükle</span>
                                <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" onChange={handleIdUpload} />
                              </label>
                              <p className="pl-1">veya sürükleyip bırakın</p>
                            </div>
                            <p className="text-xs text-slate-500">PNG, JPG, GIF (Max 10MB)</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-slate-700">
                      Onay Şifresi
                    </label>
                    <div className="mt-1">
                      <input
                        type="password"
                        value={passcodeData}
                        onChange={(e) => setPasscodeData(e.target.value)}
                        className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow font-mono tracking-widest text-lg"
                        placeholder="••••••"
                      />
                    </div>
                    <p className="text-xs text-slate-500">Yöneticinizden aldığınız onay şifresini girin.</p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 transition-colors"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-70 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'İşleniyor...' : 'Onayla ve Kaydet'}
              </button>
            </div>
            <p className="text-xs text-center text-slate-500 flex items-center justify-center gap-1">
              <ShieldCheck className="w-4 h-4" />
              Bu işlem zaman damgası ile kayıt altına alınacaktır.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BordroOnay;
