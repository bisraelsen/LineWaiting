from sqlalchemy import create_engine, MetaData, Table
import json
import numpy as np
import scipy.io
import matplotlib
import matplotlib.pyplot as plt
import pandas as pd
from sqlite3 import dbapi2 as sqlite
from types import NoneType
from datetime import datetime
#from boto.s3.multipart import Part

#db_url = "mysql://username:password@host.org/database_name"
db_url = "sqlite+pysqlite:////home/brett/GitProjects/LineWaiting/DBs/participants.db"
table_name = 'linewaiting'
data_column_name = 'datastring'

# boilerplace sqlalchemy setup
engine = create_engine(db_url)
metadata = MetaData()
metadata.bind = engine
table = Table(table_name, metadata, autoload=True)
# make a query and loop through
s = table.select()
rows = s.execute()

data = []
bonuses = []
#status codes of subjects who completed experiment
statuses = [3, 4, 5, 7]
# if you have workers you wish to exclude, add them here
exclude = ["A3R25SV8HUGML2:3XIQGXAUMC8C67LLPU0UJLQHTGAX7V","A2GZN7DE7UKJRU:3MRNMEIQW56XNM562O0S8J5R9C1LDF"]
MinDate = datetime(2015, 03, 20) #cutoff date for analysis
for row in rows:
    #print(row['status'])
    # only use subjects who completed experiment and aren't excluded
    if row['status'] in statuses and row['uniqueid'] not in exclude and row['beginhit'] > MinDate:
        data.append(row[data_column_name])
        bonuses.append(row['bonus'])

# Now we have all participant datastrings in a list.
# Let's make it a bit easier to work with:

# parse each participant's datastring as json object
# and take the 'data' sub-object
conds = [json.loads(part)['cond'] for part in data]
data = [json.loads(part)['data'] for part in data]

# insert uniqueid field into trialdata in case it wasn't added
# in experiment:
for part in range(0, len(data)):
    p = data[part]
    c = conds[part]
    b = bonuses[part]
    for record in p:
        #print(len(record))
        #if record['current_trial'] == 4 and not record.get('trialdata') is None:
        if 'trialdata' not in record.keys():
            record['trialdata'] = {}
        if 'cond' in record.keys():
            print(record['current_trial'])
        record['trialdata']['uniqueid'] = record['uniqueid']
        record['trialdata']['cond'] = c
        record['trialdata']['bonus'] = b

# flatten nested list so we just have a list of the trialdata recorded
# each time psiturk.recordTrialData(trialdata) was called.
data = [record.get('trialdata') for part in data for record in part]

# Put all subjects' trial data into a dataframe object from the
# 'pandas' python library: one option among many for analysis
data_frame = pd.DataFrame(data)

results = data_frame[['cond', 'Score', 'lines', 'positions', 'linetimes',  'keys', 'keytimes', 'rewards', 'uniqueid', 'bonus']].dropna()
myData = {}

for record in results.iterrows():
    #get unique id
    id = record[1]['uniqueid']

    #key each record on uniqueid
    myData[id] = {}
    myData[id]['score'] = float(record[1]['Score'])
    myData[id]['condition'] = bool(record[1]['cond'])
    myData[id]['bonus'] = float(record[1]['bonus'])
    myData[id]['linesStr'] = record[1]['lines'].strip('[]').split(',')
    myData[id]['lines'] = [int(x) for x in myData[id]['linesStr']]

    myData[id]['positionsStr'] = record[1]['positions'].strip('[]').split(',')
    myData[id]['positions'] = [int(x) for x in myData[id]['positionsStr']]

    myData[id]['linetimesStr'] = record[1]['linetimes'].strip('[]').split(',')
    myData[id]['linetimes'] = [int(x) for x in myData[id]['linetimesStr']]

    myData[id]['keysStr'] = record[1]['keys'].strip('[]').split(',')
    myData[id]['keysStr'][myData[id]['keysStr'] == 'null'] = 0
    myData[id]['keys'] = [int(x) for x in myData[id]['keysStr']]

    myData[id]['keytimesStr'] = record[1]['keytimes'].strip('[]').split(',')
    myData[id]['keytimes'] = [int(x) for x in myData[id]['keytimesStr']]

    myData[id]['rewardsStr'] = record[1]['rewards'].strip('[]').split(',')
    print(myData[id]['rewardsStr'])
    if len(myData[id]['rewardsStr']) == 1:
        myData[id]['rewards'] = 0
    else:
        myData[id]['rewards'] = [int(x) for x in myData[id]['rewardsStr']]

for rec in myData:
    participant = myData[rec]
    if not len(participant['positions']) == len(participant['lines']) or not len(participant['positions']) == len(participant['linetimes']):
        print('there is an error')
    else:
        rm_mat = []
        for x in range(0, len(participant['positions'])):
            remove = [False for i in range(0, len(participant['positions']))]
            if not x == 0:
                if participant['positions'][x] == participant['positions'][x-1]:
                    remove[x] = True
            else:
                remove[x] = False
        rm_mat.append(remove)
Score = {}
Score['True'] = []
Score['False'] = []

length = {}
length['True'] = []
length['False'] = []

for record in myData:
    rec = myData[record]
    if rec['condition'] == True:
        Score['True'] = Score['True'] + [rec['score']]
        length['True'] = length['True'] + [len(rec['lines'])]
    else:
        Score['False'] = Score['False'] + [rec['score']]
        length['False'] = length['False'] + [len(rec['lines'])]


print("False Condition: " + str(len(Score['False'])) + 'respondents')
print(Score['False'])
print(length['False'])
print()
print("True Condition: " + str(len(Score['True'])) + 'respondents')
print(Score['True'])
print(length['True'])

for x in Score:
    print(x)
    arr = np.array(Score[x])
    print(np.average(arr))
    print(np.std(arr))

colors = ['red', 'red', 'yellow', 'green', 'green']
levels = [0, 1, 2, 3]

cmap, norm = matplotlib.colors.from_levels_and_colors(levels=levels, colors=colors, extend = 'both')
#cmap.set_over((0.0,0.0,0.0,0.0))
plotMe = False
if plotMe:
    for key in myData:
        t = (np.array(myData[key]['linetimes']) * -1.0 + max(myData[key]['linetimes']))/1000.0 #time in seconds
        p = myData[key]['positions']
        points = plt.scatter(t,p,c = myData[key]['lines'], cmap = cmap, norm = norm, s = 50,lw = 0,label = 'stuff')
        line = plt.plot(t,p,alpha=.25,lw=1)
        plt.title('Condition: ' + str(myData[key]['condition']) + ', Score: ' + str(myData[key]['score']))
        plt.autoscale(True,tight=True)
        plt.xlabel('Time')
        plt.ylabel('Position in Line')
        #legend
        cbar = plt.colorbar(extendrect=True)

        cbar.ax.get_yaxis().set_ticks([])
        #cbar.ax.set_ybound(upper=10.0)
        for j, lab in enumerate(['$0$','$1$','$2$']):
            cbar.ax.text(.5, (2 * j + 1) / 6.0, lab, ha='center', va='center')
        cbar.ax.get_yaxis().labelpad = 15
        cbar.ax.set_ylabel('Line Number', rotation=270)
        print(key)
        plt.show()

line_mat = []
line_times = []
pos_mat = []
cond_mat = []
ident_mat = []
score_mat = []
rewards_mat = []
for key in myData:
    line_mat.append(myData[key]['lines'])
    line_times.append(myData[key]['linetimes'])
    pos_mat.append(myData[key]['positions'])
    cond_mat.append(myData[key]['condition'])
    ident_mat.append(key)
    score_mat.append(myData[key]['score'])
    rewards_mat.append(myData[key]['rewards'])

line_mat = np.array(line_mat)
line_times = np.array(line_times)
pos_mat = np.array(pos_mat)
cond_mat = np.array(cond_mat, dtype = np.int)
score_mat = np.array(score_mat, dtype = np.int)
ident_mat = np.array(ident_mat)
rewards_mat = np.array(rewards_mat)

#plt.scatter(range(0,len(score_mat[cond_mat.astype(bool)])),score_mat[cond_mat.astype(bool)])
#plt.show()

scipy.io.savemat('data_mar_v2.mat', mdict={'Lines': line_mat,'LineTimes':line_times, 'Positions': pos_mat, 'Conditions':cond_mat,'ID':ident_mat,'Rewards':rewards_mat,'Score':score_mat})
