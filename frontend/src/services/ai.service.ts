import { apiDownload, apiRequest, apiUploadFile } from '@/src/services/api.client';
import type {
  AiAvailability,
  DocAnalysis,
  HandsfreeAnswer,
  HandsfreeSession,
  PhotoWordResult,
  SemanticGraph,
  SpeakingAttempt,
  SpeakingResult,
  SpeakingSample,
} from '@/src/types';

export const aiService = {
  availability() {
    return apiRequest<AiAvailability>('/api/ai/availability');
  },

  // --- 6.1 Semantic word network (cached in word_relations by the backend) ---
  async semanticGraph(word: string): Promise<SemanticGraph> {
    const response = await apiRequest<{
      word?: string;
      center?: SemanticGraph['center'];
      relations?: Array<{
        word?: string;
        relation?: string;
        relationType?: string;
        example?: string | null;
        exampleEn?: string | null;
      }>;
    }>(`/api/ai/semantic?word=${encodeURIComponent(word)}`);

    const centerWord = response.center?.word ?? response.word;
    if (!centerWord || !Array.isArray(response.relations)) {
      throw new Error('Máy chủ trả về mạng từ không đúng định dạng.');
    }

    const relationNames: Record<string, SemanticGraph['relations'][number]['relation']> = {
      synonym: 'synonym',
      antonym: 'antonym',
      wordFamily: 'wordFamily',
      word_family: 'wordFamily',
      collocation: 'collocation',
      related: 'related',
    };

    return {
      center: response.center ?? { word: centerWord },
      relations: response.relations.flatMap((relation) => {
        const name = relation.relation ?? relation.relationType ?? '';
        const mappedName = relationNames[name];
        if (!relation.word || !mappedName) return [];
        return [{
          word: relation.word,
          relation: mappedName,
          example: relation.example ?? relation.exampleEn ?? null,
        }];
      }),
    };
  },

  saveSemanticWord(word: string) {
    return apiRequest<{ id: string }>('/api/ai/semantic/save', { method: 'POST', body: { word } });
  },

  // --- 6.2 Camera photo-to-name ---
  async recognizePhoto(imageUri: string, fileName = 'photo.jpg'): Promise<PhotoWordResult> {
    const response = await apiUploadFile<{
      englishName?: string;
      word?: string;
      ipa?: string | null;
      meaningVi: string;
      exampleEn?: string | null;
      imageUrl?: string;
      imagePath?: string;
    }>(
      '/api/ai/photo',
      { uri: imageUri, name: fileName, type: 'image/jpeg' },
      'image'
    );
    const englishName = response.englishName ?? response.word;
    if (!englishName) {
      throw new Error('Máy chủ không trả về tên vật thể nhận diện được.');
    }
    return {
      englishName,
      ipa: response.ipa,
      meaningVi: response.meaningVi,
      exampleEn: response.exampleEn,
      imageUrl: response.imageUrl ?? response.imagePath ?? imageUri,
    };
  },

  savePhotoWord(payload: {
    englishName: string;
    ipa?: string;
    meaningVi: string;
    exampleEn?: string;
    imageUrl: string;
  }) {
    return apiRequest<{ id: string }>('/api/ai/photo/save', { method: 'POST', body: payload });
  },

  // --- 6.3 Docs upload -> analysis ---
  uploadDoc(fileUri: string, fileName: string, mimeType: string) {
    return apiUploadFile<{ analysisId: string }>(
      '/api/ai/docs/upload',
      { uri: fileUri, name: fileName, type: mimeType },
      'file'
    );
  },

  async docAnalysis(analysisId: string): Promise<DocAnalysis> {
    const response = await apiRequest<{
      id: string;
      filename?: string;
      fileName?: string;
      createdAt: string;
      status?: DocAnalysis['status'];
      progress?: number;
      result?: {
        vocabulary?: Array<{ word: string; meaningVi: string }>;
        grammarPoints?: Array<string | { title?: string; explanation?: string }>;
        tips?: string[];
        questions?: Array<{
          id?: string;
          part: number;
          prompt: string;
          options: string[];
          answerIndex?: number;
          correctIndex?: number;
          explanation?: string;
        }>;
      };
      wordsAdded?: number;
      vocabAdded?: DocAnalysis['vocabAdded'];
      grammarPoints?: DocAnalysis['grammarPoints'];
      tips?: DocAnalysis['tips'];
      questions?: DocAnalysis['questions'];
      error?: string | null;
    }>(`/api/ai/docs/${analysisId}`);

    const result = response.result;
    return {
      id: response.id,
      fileName: response.fileName ?? response.filename ?? 'Tài liệu',
      status: response.status ?? 'DONE',
      progress: response.progress ?? 100,
      createdAt: response.createdAt,
      vocabAdded: response.vocabAdded ?? result?.vocabulary,
      grammarPoints: response.grammarPoints ?? result?.grammarPoints?.map((point) =>
        typeof point === 'string' ? point : [point.title, point.explanation].filter(Boolean).join(': ')
      ),
      tips: response.tips ?? result?.tips,
      questions: response.questions ?? result?.questions?.map((question, index) => ({
        id: question.id ?? `${analysisId}-${index}`,
        part: question.part,
        prompt: question.prompt,
        options: question.options,
        correctIndex: question.correctIndex ?? question.answerIndex ?? 0,
        explanation: question.explanation ?? '',
      })),
      error: response.error,
    };
  },

  async docHistory(): Promise<DocAnalysis[]> {
    const response = await apiRequest<Array<{
      id: string;
      filename?: string;
      fileName?: string;
      createdAt: string;
      status?: DocAnalysis['status'];
      progress?: number;
      wordsAdded?: number;
    }>>('/api/ai/docs/history');

    return response.map((item) => ({
      id: item.id,
      fileName: item.fileName ?? item.filename ?? 'Tài liệu',
      status: item.status ?? 'DONE',
      progress: item.progress ?? 100,
      createdAt: item.createdAt,
      vocabAdded: item.wordsAdded ? [] : undefined,
    }));
  },

  // --- 6.4 Speaking coach ---
  speakingSamples() {
    return apiRequest<SpeakingSample[]>('/api/ai/speaking/samples');
  },

  scoreSpeaking(audioUri: string, sampleId: string) {
    return apiUploadFile<SpeakingResult>(
      '/api/ai/speaking/score',
      { uri: audioUri, name: 'speaking.m4a', type: 'audio/m4a' },
      'audio',
      { sampleId }
    );
  },

  speakingHistory() {
    return apiRequest<SpeakingAttempt[]>('/api/ai/speaking/history');
  },

  // --- 6.5 Hands-free voice learning ---
  startHandsfree(count = 10) {
    return apiRequest<HandsfreeSession>('/api/ai/handsfree/session', {
      method: 'POST',
      body: { count },
    });
  },

  answerHandsfree(sessionId: string, itemId: string, audioUri: string) {
    return apiUploadFile<HandsfreeAnswer>(
      '/api/ai/handsfree/answer',
      { uri: audioUri, name: 'answer.m4a', type: 'audio/m4a' },
      'audio',
      { sessionId, itemId }
    );
  },

  // TTS bytes from backend proxy: GET /api/tts?text=...&voice=george
  ttsAudio(text: string, voice = 'george') {
    const query = new URLSearchParams({ text, voice });
    return apiDownload(`/api/tts?${query.toString()}`);
  },
};
