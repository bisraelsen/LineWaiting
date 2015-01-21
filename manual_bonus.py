# this file imports custom routes into the experiment server

from flask import Blueprint, render_template, request, jsonify, Response, abort, current_app
from jinja2 import TemplateNotFound
from functools import wraps
from sqlalchemy import or_

from psiturk.psiturk_config import PsiturkConfig
from psiturk.experiment_errors import ExperimentError
from psiturk.user_utils import PsiTurkAuthorization, nocache

# # Database setup
from psiturk.db import db_session, init_db
from psiturk.models import Participant
from json import dumps, loads
#from _mysql import NULL
from sqlalchemy.sql.expression import null

# load the configuration options
config = PsiturkConfig()

config.load_config()
myauth = PsiTurkAuthorization(config)  # if you want to add a password protect route use this

def compute_bonus_all():
    # check that user provided the correct keys
    # errors will not be that gracefull here if being
    # accessed by the Javascrip client
    #if not request.args.has_key('uniqueId'):
    Participants = db_session.query(Participant).all()
    for par in Participants:
        # lookup user in database
        if par.status in [3,4]: # only if the bonus hasn't already been computed
            user_data = loads(par.datastring) # load datastring from JSON
            bonus = 0
            print(par.workerid)
            for record in user_data['data']: # for line in data file
                if not record.get('trialdata') is None:
                    trial = record['trialdata']
                    if trial['phase']=='GAME':
                        if trial['Score']!=0:
                            bonus += round(trial['Score'] * .0002,2) #.02% bonus
                        
            par.bonus = bonus
            db_session.add(par)
            db_session.commit()
            print(bonus)

compute_bonus_all()
