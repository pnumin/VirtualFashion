import React, { useState, useCallback, useMemo } from 'react';
import { GoogleGenAI, Modality } from '@google/genai';

// --- TYPE DEFINITIONS ---
interface ImageState {
  base64: string;
  mimeType: string;
}

// --- SVG ICON COMPONENTS ---
const PersonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
  </svg>
);

const ShirtIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.39 6.84c-.23-.48-.72-.77-1.24-.77H6.85c-.52 0-1.01.29-1.24.77L2 15.61V20h20v-4.39l-3.61-8.77zM8.5 12H11v6H7v-4.83l1.5-3.17zm4-1h-1V9h1v2zm1 1h1.5l1.5 3.17V18h-4v-6h2.5z" />
  </svg>
);

const PantsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500" viewBox="0 0 24 24" fill="currentColor">
        <path d="M8 21V9h2v12H8zm6 0V9h2v12h-2zM8 5V3h8v2H8z" />
    </svg>
);

const SparklesIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm6 0a1 1 0 011 1v1h1a1 1 0 010 2h-1v1a1 1 0 01-2 0V6h-1a1 1 0 010-2h1V3a1 1 0 011-1zM3 13a1 1 0 011 1v1h1a1 1 0 010 2H4v1a1 1 0 01-2 0v-1H1a1 1 0 010-2h1v-1a1 1 0 011-1zm12-2a1 1 0 011-1h1a1 1 0 010 2h-1a1 1 0 01-1-1zM9 8a1 1 0 011-1h1a1 1 0 010 2h-1a1 1 0 01-1-1zm6 5a1 1 0 011-1h1a1 1 0 010 2h-1a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
);

const LoadingSpinner = () => (
    <div className="flex flex-col items-center justify-center h-full gap-4">
        <svg className="animate-spin h-10 w-10 text-violet-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-lg text-gray-300 animate-pulse">이미지를 생성중입니다...</p>
    </div>
);

// --- HELPER FUNCTIONS ---
const fileToImageState = (file: File): Promise<ImageState> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                resolve({ base64: reader.result, mimeType: file.type });
            } else {
                reject(new Error('Failed to read file as string'));
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};


// --- UI SUB-COMPONENTS ---
interface ImageUploaderProps {
    id: string;
    title: string;
    icon: React.ReactNode;
    image: ImageState | null;
    onImageChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ id, title, icon, image, onImageChange }) => {
    return (
        <div className="w-full h-full bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-600 flex flex-col items-center justify-center p-4 transition-all duration-300 hover:border-violet-500 hover:bg-gray-800 relative">
            {image ? (
                <img src={image.base64} alt={title} className="max-h-full max-w-full object-contain rounded-lg" />
            ) : (
                <div className="text-center">
                    {icon}
                    <h3 className="mt-2 text-lg font-medium text-white">{title}</h3>
                    <p className="mt-1 text-sm text-gray-400">사진을 업로드 해주세요.</p>
                </div>
            )}
            <input
                id={id}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={onImageChange}
            />
            <label htmlFor={id} className="absolute inset-0 cursor-pointer rounded-2xl"></label>
        </div>
    );
};

// --- MAIN APP COMPONENT ---
export default function App() {
    const [personImage, setPersonImage] = useState<ImageState | null>(null);
    const [topImage, setTopImage] = useState<ImageState | null>(null);
    const [bottomImage, setBottomImage] = useState<ImageState | null>(null);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleImageChange = useCallback(
      (setter: React.Dispatch<React.SetStateAction<ImageState | null>>) =>
        async (event: React.ChangeEvent<HTMLInputElement>) => {
            if (event.target.files && event.target.files[0]) {
                try {
                    const file = event.target.files[0];
                    const imageState = await fileToImageState(file);
                    setter(imageState);
                    setResultImage(null);
                    setError(null);
                } catch (err) {
                    console.error(err);
                    setError('이미지를 읽는 데 실패했습니다.');
                }
            }
        },
      []
    );

    const handleTryOn = async () => {
        if (!personImage || !topImage || !bottomImage) {
            setError('인물, 상의, 하의 사진을 모두 업로드해주세요.');
            return;
        }

        setIsLoading(true);
        setError(null);
        setResultImage(null);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image',
                contents: {
                    parts: [
                        { text: '이 사람입니다:' },
                        {
                            inlineData: {
                                data: personImage.base64.split(',')[1],
                                mimeType: personImage.mimeType,
                            },
                        },
                        { text: '이 상의를 입혀주세요:' },
                        {
                            inlineData: {
                                data: topImage.base64.split(',')[1],
                                mimeType: topImage.mimeType,
                            },
                        },
                        { text: '그리고 이 하의를 입혀주세요:' },
                        {
                            inlineData: {
                                data: bottomImage.base64.split(',')[1],
                                mimeType: bottomImage.mimeType,
                            },
                        },
                        {
                            text: '최종 결과물은 옷을 입은 사람만 보여주고, 매우 사실적으로 만들어 주세요.',
                        },
                    ],
                },
                config: {
                    responseModalities: [Modality.IMAGE],
                },
            });

            let foundImage = false;
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    const base64ImageBytes: string = part.inlineData.data;
                    const imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
                    setResultImage(imageUrl);
                    foundImage = true;
                    break;
                }
            }

            if (!foundImage) {
                 setError('모델이 이미지를 생성하지 못했습니다. 다른 사진으로 시도해보세요.');
            }

        } catch (err) {
            console.error(err);
            setError('API 요청 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    const isButtonDisabled = !personImage || !topImage || !bottomImage || isLoading;
    const buttonText = useMemo(() => {
        if (isLoading) return '생성 중...';
        return '가상 피팅 시작';
    }, [isLoading]);

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col p-4 md:p-8 relative pb-28">
            <header className="text-center mb-8">
                <h1 className="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                    가상 패션 피팅룸
                </h1>
                <p className="mt-2 text-lg text-gray-300">NanoBanana AI로 새로운 스타일을 입어보세요</p>
            </header>

            <main className="flex-grow grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
                {/* Left Column for Uploads */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="flex-1 min-h-[200px]">
                        <ImageUploader
                            id="person-upload"
                            title="인물 사진"
                            icon={<PersonIcon />}
                            image={personImage}
                            onImageChange={handleImageChange(setPersonImage)}
                        />
                    </div>
                    <div className="flex-1 min-h-[200px]">
                        <ImageUploader
                            id="top-upload"
                            title="상의 사진"
                            icon={<ShirtIcon />}
                            image={topImage}
                            onImageChange={handleImageChange(setTopImage)}
                        />
                    </div>
                    <div className="flex-1 min-h-[200px]">
                        <ImageUploader
                            id="bottom-upload"
                            title="하의 사진"
                            icon={<PantsIcon />}
                            image={bottomImage}
                            onImageChange={handleImageChange(setBottomImage)}
                        />
                    </div>
                </div>

                {/* Right Column for Result */}
                <div className="lg:col-span-2 relative min-h-[400px] lg:min-h-0 bg-gray-800/50 rounded-2xl border-2 border-dashed border-gray-600 flex items-center justify-center p-4">
                    {isLoading && <LoadingSpinner />}
                    {error && !isLoading && (
                        <div className="text-center text-red-400 p-4">
                            <h3 className="font-bold text-lg">오류 발생</h3>
                            <p>{error}</p>
                        </div>
                    )}
                    {resultImage && !isLoading && !error && (
                         <img src={resultImage} alt="Fitting result" className="max-h-full max-w-full object-contain rounded-lg" />
                    )}
                    {!isLoading && !error && !resultImage && (
                        <div className="text-center">
                            <SparklesIcon />
                            <h3 className="mt-2 text-lg font-medium text-white">결과</h3>
                            <p className="mt-1 text-sm text-gray-400">피팅 결과가 여기에 표시됩니다.</p>
                        </div>
                    )}
                </div>
            </main>

            <footer className="fixed bottom-0 left-0 right-0 p-4 bg-gray-900/80 backdrop-blur-sm border-t border-gray-700">
                <div className="max-w-4xl mx-auto">
                    <button
                        onClick={handleTryOn}
                        disabled={isButtonDisabled}
                        className="w-full flex items-center justify-center text-lg font-semibold px-6 py-4 rounded-lg bg-violet-600 text-white transition-all duration-300 ease-in-out disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed hover:enabled:bg-violet-700 focus:outline-none focus:ring-4 focus:ring-violet-400 focus:ring-opacity-50 transform hover:enabled:scale-105"
                    >
                        {isLoading ? <div className="h-6 w-6 border-4 border-t-transparent border-white rounded-full animate-spin mr-3"></div> : <SparklesIcon />}
                        {buttonText}
                    </button>
                </div>
            </footer>
        </div>
    );
}