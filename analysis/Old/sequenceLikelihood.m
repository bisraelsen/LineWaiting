function varargout = sequenceLikelihood(moves,gameLayout,gamma,boolMat)
%%%%%
%sequenceLikelihood(moves,gamma) - function that calculates the likelihood 
%   of a sequence of moves happening in the line waiting game. 
%
%INPUTS
% moves - structure that contains:
%   Lines - sequence of line number value corresponding to which line the
%       player was in at each time step
%   Positions - sequence of line position values corresponding to the Lines
%       sequence
%
% gameLayout - structure representing game layout
%   Lines - integer number of lines
%   LineLengths - array of length(Lines) with corresponding lengths of each
%       line
%   LineRewards - array of length(Lines) with corresponding lengths of each
%       line
% gamma - discounting factor. Value of 1 means no discounting (discounting
%       rate=0) value of 0 means discounting rate=infinity
%
%OUTPUTS
%
%
%
%
%%%%%%%
%set maximum planning steps
max_planning_steps = max(gameLayout.LineLengths)+1;

% calculate a geometric distribution for use later
w = (1-gamma) .* gamma .^ (0:max_planning_steps-2);
% add the complimentary probability of the geometric distribution as
% the last element
w(end+1) = 1 - sum(w);

%initialize the overall log likelihood, this is added to inside the loop
overall_logL = 0;
expected_L=zeros(length(moves.Lines)-1,max(max_planning_steps));
%Loop through the sequence of moves
for i = 1:length(moves.Lines)-1
    %initialize state (first elements of the moves.Lines and
    %moves.Position)
    state.Line = moves.Lines(i);
    state.Position = moves.Positions(i);
    state.GameLayout = gameLayout;
    
    %create the next state
    state_plus1.Line = moves.Lines(i+1);
    state_plus1.Position = moves.Positions(i);
    L=zeros(1,max(max_planning_steps));
    %Loop through the possible number of planning steps
    for n_planning_steps = 1:max(max_planning_steps)
       L(n_planning_steps) = myLikelihood (state,n_planning_steps,state_plus1); 
    end  
    expected_L(i,:) = w.*L;
    overall_logL = log(sum(expected_L(i,:)))+overall_logL;
end
%contour(expected_L)

varargout{1} = overall_logL;

if boolMat == true
    varargout{2} = expected_L;    
end
