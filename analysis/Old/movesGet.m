function Moves = movesGet(Ls,Ps,n)
    %Remove last 10% of points
    Pct = 0.1;
    PctRemove = round(length(Ls{n}) * Pct);

    L_seq = Ls{n}(1:end-PctRemove)+1; %add one to make lines 1 based instead of 0 based
    P_seq = Ps{n}(1:end-PctRemove);
    
    %Check to make sure line lengths are the same
    if length(L_seq) ~= length(P_seq)
        error('Arrays not the same length')
    end
    
    %Mark areas where the player was jumped
    P_seq_cut = true(length(P_seq),1);
    L_seq_cut = true(length(L_seq),1);
    for j = 1:length(P_seq)-1
        if j ~= 1
            if P_seq(j) == P_seq(j-1) && L_seq(j) == L_seq(j-1)
                P_seq_cut(j) = false;
                L_seq_cut(j) = false;
            end
        end
    end
    
    %count line changes
    Moves.LineChange = 0;
    for j = 1:length(L_seq)-1
        if j ~= 1
            if L_seq(j) ~= L_seq(j-1)
                Moves.LineChange = Moves.LineChange + 1;
            end
        end
    end
    
    %moving average measurement of line changes
    window = 10;
    Moves.LC_mavg = zeros(length(L_seq)-window,1);
    for k = 1:length(L_seq)-window
       L_win = L_seq(k:k+window);
       for j = 1:length(L_win)-1
            if j ~= 1
                if L_win(j) ~= L_win(j-1)
                    Moves.LC_mavg(k) = Moves.LC_mavg(k) + 1/window;
                end
            end
       end
    end
    
    Moves.Lines=L_seq(L_seq_cut);
    Moves.Positions= P_seq(P_seq_cut);
    Moves.Jumped = length(L_seq)-sum(L_seq_cut);
    Moves.Jumped_pct = Moves.Jumped / length(L_seq);
    Moves.LineChange_pct = Moves.LineChange/length(L_seq); 
end