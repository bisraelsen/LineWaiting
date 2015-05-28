clc;
clear;

% Define game layout
Game.Lines = 3;
Game.LineLengths = [3,6,12];
Game.LineRewards = [9,24,60];

% Load experimental results
load('raw_data/data_mar.mat')

% Convert "Conditions" to bool
Conditions = logical(Conditions);

% produce logspaced gammas between nearly zero and nearly one, the
% geometric distribution is not defined at one.
gamma_1 = logspace(-2,0-.001,100);
gamma = 1-gamma_1;

g_seq = [.85:.01:.95];

%Initialize Moves cell array
Moves = cell(1,length(Lines));

prog = 'Init'

for n = 1:length(Lines)    
    n
    %Simulate some player moves
    Moves{n} = movesGet(Lines,Positions,n);
    Jumped(n) = Moves{n}.Jumped_pct;
    LineChange(n) = Moves{n}.LineChange_pct;
    LC_mavg(n) = {Moves{n}.LC_mavg};
end

% prog = 'optimize'
% parfor n = 1:length(Lines)    
%     n
%     %used simulated annealing to help find global optimum
%     x(n) = simulannealbnd(@(g)minusSeqL(Moves{n},Game,g,true),0.90,0,.999);
% end

prog = 'sequence'
for n = 1:length(Lines)
    n
    parfor j = 1:length(gamma)
        L_seq(n,j) = sequenceLikelihood(Moves{n}, Game,gamma(j),false);
    end
    
    MLE(n) = max(L_seq(n,:));
    
end

figure(1)
subplot(1,2,1)
hold on
plot(Score(Conditions),'o')
plot(Score(~Conditions),'r*')
title('Scores by Condition')
legend('Hint','No Hint')
xlabel('')
ylabel('Score')
hold off

subplot(1,2,2)
hold on
plot(x(Conditions),'o')
plot(x(~Conditions),'r*')
title('gamma by Condition')
legend('Hint','No Hint')
xlabel('')
ylabel('gamma')
hold off

figure(2)
subplot(1,2,1)
boxplot(double(Score),Conditions,'notch','on');
title('Score Boxplot (0 - No Hint, 1 - Hint)')

subplot(1,2,2)
boxplot(x,Conditions,'notch','on');
title('Gamma Boxplot (0 - No Hint, 1 - Hint)')

figure(3)
subplot(1,2,1)
boxplot(Jumped,Conditions,'notch','on');
title('Percent Jumped Boxplot (0 - No Hint, 1 - Hint)')

subplot(1,2,2)
boxplot(LineChange,Conditions,'notch','on');
title('Line Change Percent Boxplot (0 - No Hint, 1 - Hint)')

t = now;
tstr  = datestr(t);
save(strcat('experiment_results_',tstr))