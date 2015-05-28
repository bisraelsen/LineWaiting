%define function to be used in optimization, return negative of
%sequenceLikelihood, because optimization looks for minimum
function L = minusSeqL(Moves, Game, g,boolMat)
   L = -sequenceLikelihood(Moves, Game, g,boolMat);