function L = myLikelihood (state,n_planning_steps,state_plus1)

Line = state.Line;
Line_plus1 = state_plus1.Line;
Pos = state.Position;
Lengths = state.GameLayout.LineLengths;
Lines = state.GameLayout.Lines;
%make some base probability (not zero) for cases when human makes an
%"irrational" choice
base = 0.0001;

%use current position?
usecurrentpos = true;
if usecurrentpos
    
    if Line == 1
        Line1 = Pos;
        Line2 = Lengths(2)+1;
        Line3 = Lengths(3)+1;
    elseif Line == 2
        Line1 = Lengths(1)+1;
        Line2 = Pos;
        Line3 = Lengths(3)+1;
    elseif Line == 3
        Line1 = Lengths(1)+1;
        Line2 = Lengths(2)+1;
        Line3 = Pos;
    end
else
    Line1 = Lengths(1)+1;
    Line2 = Lengths(2)+1;
    Line3 = Lengths(3)+1;
end

    
if (n_planning_steps < Line1)
    Prob = [1/3 1/3 1/3];%Can't see the end of any line
    L = Prob(Line_plus1);
elseif (n_planning_steps < Line2)
    Prob = [(1-2*base) base base];%Can see the end of the 1st line
    L = Prob(Line_plus1);
elseif (n_planning_steps < Line3)
    Prob = [base (1-2*base) base];%Can see the end of the 2nd line
    L = Prob(Line_plus1);
else %
    Prob = [base base (1-2*base)];%Can see the end of the 3rd line
    L = Prob(Line_plus1);
end


    