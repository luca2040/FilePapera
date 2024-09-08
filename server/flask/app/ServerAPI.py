import json
from flask import Blueprint

api = Blueprint('api', __name__)


@api.route('/api', methods=['GET'])
def missing_values():
    response = {
        'message': 'OK',
        'data': "test"
    }

    return json.dumps(response), 200
