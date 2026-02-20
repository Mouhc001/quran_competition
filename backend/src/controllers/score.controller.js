import Score from '../models/Score.model.js';

// Helper function pour convertir les nombres
const convertNumbers = (scores) => {
  return scores.map(score => ({
    ...score,
    total_score: typeof score.total_score === 'number' ? score.total_score : parseFloat(score.total_score) || 0,
    average_per_question: typeof score.average_per_question === 'number' ? score.average_per_question : parseFloat(score.average_per_question) || 0,
    judges_count: typeof score.judges_count === 'number' ? score.judges_count : parseInt(score.judges_count, 10) || 0,
    judges_details: score.judges_details ? score.judges_details.map(judge => ({
      ...judge,
      judge_total: typeof judge.judge_total === 'number' ? judge.judge_total : parseFloat(judge.judge_total) || 0,
      questions: judge.questions ? judge.questions.map(q => ({
        ...q,
        question_total: typeof q.question_total === 'number' ? q.question_total : parseFloat(q.question_total) || 0,
        recitation_score: typeof q.recitation_score === 'number' ? q.recitation_score : parseFloat(q.recitation_score) || 0,
        siffat_score: typeof q.siffat_score === 'number' ? q.siffat_score : parseFloat(q.siffat_score) || 0,
        makharij_score: typeof q.makharij_score === 'number' ? q.makharij_score : parseFloat(q.makharij_score) || 0,
        minor_error_score: typeof q.minor_error_score === 'number' ? q.minor_error_score : parseFloat(q.minor_error_score) || 0
      })) : []
    })) : []
  }));
};

export const submitScore = async (req, res) => {
  try {
    const { candidateId, roundId } = req.params;
    const { questions } = req.body;
    const judgeId = req.user.id;

    if (!questions || !Array.isArray(questions) || questions.length !== 5) {
      return res.status(400).json({
        success: false,
        message: '5 questions requises'
      });
    }

    const scoreData = {
      candidate_id: candidateId,
      judge_id: judgeId,
      round_id: roundId,
      questions
    };

    const scores = await Score.submit(scoreData);

    res.json({
      success: true,
      message: 'Score enregistré avec succès',
      data: scores
    });
  } catch (error) {
    console.error('Erreur soumission score:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

export const getCandidateScores = async (req, res) => {
  try {
    const { candidateId, roundId } = req.params;
    
    const scores = await Score.getCandidateScores(candidateId, roundId);
    
    res.json({
      success: true,
      data: scores
    });
  } catch (error) {
    console.error('Erreur récupération scores candidat:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

export const getRoundResults = async (req, res) => {
  try {
    const { roundId } = req.params;
    
    const results = await Score.getRoundResults(roundId);
    
    // Convertir les nombres
    const convertedResults = results.map(result => ({
      ...result,
      average_score: parseFloat(result.average_score) || 0
    }));
    
    res.json({
      success: true,
      data: convertedResults
    });
  } catch (error) {
    console.error('Erreur récupération résultats tour:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

export const getScoresByRoundCategory = async (req, res) => {
  try {
    const { roundId, categoryId } = req.params;
    
    const scores = await Score.getScoresByRoundCategory(roundId, categoryId);
    
    // CONVERSION FORCÉE
    const convertedScores = scores.map(score => ({
      ...score,
      total_score: parseFloat(score.total_score) || 0,
      average_per_question: parseFloat(score.average_per_question) || 0,
      judges_count: parseInt(score.judges_count, 10) || 0,
    }));
    
    res.json({
      success: true,
      data: convertedScores
    });
    
  } catch (error) {
    res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
};
export const getScoreStatistics = async (req, res) => {
  try {
    const { roundId, categoryId } = req.params;
    
    const statistics = await Score.getScoreStatistics(roundId, categoryId);
    
    if (!statistics) {
      return res.json({
        success: true,
        data: {
          candidates_count: 0,
          average_total: 0,
          lowest_score: 0,
          highest_score: 0,
          standard_deviation: 0,
          excellent_count: 0,
          good_count: 0,
          average_count: 0,
          poor_count: 0
        }
      });
    }
    
    // Convertir les nombres
    const convertedStats = {
      candidates_count: typeof statistics.candidates_count === 'number' ? statistics.candidates_count : parseInt(statistics.candidates_count, 10) || 0,
      average_total: typeof statistics.average_total === 'number' ? statistics.average_total : parseFloat(statistics.average_total) || 0,
      lowest_score: typeof statistics.lowest_score === 'number' ? statistics.lowest_score : parseFloat(statistics.lowest_score) || 0,
      highest_score: typeof statistics.highest_score === 'number' ? statistics.highest_score : parseFloat(statistics.highest_score) || 0,
      standard_deviation: typeof statistics.standard_deviation === 'number' ? statistics.standard_deviation : parseFloat(statistics.standard_deviation) || 0,
      excellent_count: typeof statistics.excellent_count === 'number' ? statistics.excellent_count : parseInt(statistics.excellent_count, 10) || 0,
      good_count: typeof statistics.good_count === 'number' ? statistics.good_count : parseInt(statistics.good_count, 10) || 0,
      average_count: typeof statistics.average_count === 'number' ? statistics.average_count : parseInt(statistics.average_count, 10) || 0,
      poor_count: typeof statistics.poor_count === 'number' ? statistics.poor_count : parseInt(statistics.poor_count, 10) || 0
    };
    
    console.log('📊 [CONTROLLER] Statistiques converties:', convertedStats);
    
    res.json({
      success: true,
      data: convertedStats
    });
    
  } catch (error) {
    console.error('❌ [CONTROLLER] Erreur statistiques:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

export const getScoresByQuestion = async (req, res) => {
  try {
    const { roundId, categoryId } = req.params;
    
    const scores = await Score.getScoresByQuestion(roundId, categoryId);
    
    res.json({
      success: true,
      data: scores
    });
  } catch (error) {
    console.error('Erreur récupération scores par question:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};

export const getCandidateScoreSummary = async (req, res) => {
  try {
    const { candidateId, roundId } = req.params;
    
    const summary = await Score.getCandidateScoreSummary(candidateId, roundId);
    
    if (summary) {
      // Convertir les nombres
      const convertedSummary = {
        ...summary,
        total_score: parseFloat(summary.total_score) || 0,
        average_per_question: parseFloat(summary.average_per_question) || 0,
        judges_count: parseInt(summary.judges_count, 10) || 0,
        judges_details: summary.judges_details ? summary.judges_details.map(judge => ({
          ...judge,
          judge_total: parseFloat(judge.judge_total) || 0,
          questions: judge.questions ? judge.questions.map(q => ({
            ...q,
            question_total: parseFloat(q.question_total) || 0,
            recitation_score: parseFloat(q.recitation_score) || 0,
            siffat_score: parseFloat(q.siffat_score) || 0,
            makharij_score: parseFloat(q.makharij_score) || 0,
            minor_error_score: parseFloat(q.minor_error_score) || 0
          })) : []
        })) : []
      };
      
      res.json({
        success: true,
        data: convertedSummary
      });
    } else {
      res.json({
        success: true,
        data: null
      });
    }
  } catch (error) {
    console.error('Erreur récupération résumé candidat:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};
