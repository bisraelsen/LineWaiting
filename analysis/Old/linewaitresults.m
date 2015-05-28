%load('experiment_results_08-Jan-2015 15:39:09')
%load('experiment_results_03-Mar-2015 09:59:45.mat')
load('mat_data/experiment_results_26-Mar-2015 22:44:33.mat')
gammanoh=x(~Conditions)
gammah = x(Conditions)
scorenoh=Score(~Conditions)
scoreh =Score(Conditions)
jumpednoh = Jumped(~Conditions)
jumpedh = Jumped(Conditions)
linecnoh = LineChange(~Conditions)
linech = LineChange(Conditions)

figure(1)
subplot(1,2,1)
hold off
plot([0 sort(scoreh) 1300], [(0:length(scoreh))/length(scoreh) 1],'g')
hold on
plot([0 sort(scorenoh) 1300], [(0:length(scorenoh))/length(scorenoh) 1],'r')
ylabel('proportion scores below threshold')
xlabel('score threshold')
legend('hint','no hint');

subplot(1,2,2)
hold off
plot([0 sort(gammah) 1], [(0:length(gammah))/length(gammah) 1],'g')
hold on
plot([0 sort(gammanoh) 1], [(0:length(gammanoh))/length(gammanoh) 1],'r')
ylabel('proportion gammas below threshold')
xlabel('gamma threshold')
legend('hint','no hint');

figure(2)
subplot(1,2,1)
hold off
plot([0 sort(linech) .5], [(0:length(linech))/length(linech) 1],'g')
hold on
plot([0 sort(linecnoh) .5], [(0:length(linecnoh))/length(linecnoh) 1],'r')
ylabel('proportion LineChange below threshold')
xlabel('LineChange threshold')
legend('hint','no hint');

subplot(1,2,2)
hold off
plot([0 sort(jumpedh) .5], [(0:length(jumpedh))/length(jumpedh) 1],'g')
hold on
plot([0 sort(jumpednoh) .5], [(0:length(jumpednoh))/length(jumpednoh) 1],'r')
ylabel('proportion jumped below threshold')
xlabel('jumped threshold')
legend('hint','no hint');

figure(3)
hold off
plot(Score(Conditions),x(Conditions),'b*')
hold on
plot(Score(~Conditions),x(~Conditions),'ro')
ylabel('Gamma')
xlabel('Score')
title('Score vs. Gamma')
legend('hint','no hint')

