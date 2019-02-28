import json
import argparse
from ortools.graph import pywrapgraph

'''
Use maximum flow, minimum cost algorithm with the help of
the ortools package. See https://cs.stackexchange.com/questions/104854/placing-items-into-compatible-bucket-types-to-find-an-optimal-total-value.
'''

def main():
  """Solves the maxFlowMinCost problem in the context of nhl players getting assigned to an active roster"""

  parser = argparse.ArgumentParser(description='Process some integers.')
  parser.add_argument('input')
  args = parser.parse_args()
  input = json.loads(args.input)
  debug = False

  # inputString = '{"players":[{"name":"Auston Matthews","currentPosition":"C","posList":["C"],"value":17.272916666666667,"hasGameToday":true,"unhealthy":false},{"name":"Tomas Hertl","currentPosition":"RW","posList":["C","LW","RW"],"value":14.594915254237286,"hasGameToday":true,"unhealthy":false},{"name":"Claude Giroux","currentPosition":"LW","posList":["C","LW"],"value":14.344444444444445,"hasGameToday":true,"unhealthy":false},{"name":"Max Domi","currentPosition":"LW","posList":["C","LW"],"value":14.04375,"hasGameToday":true,"unhealthy":false},{"name":"Ryan Johansen","currentPosition":"C","posList":["C"],"value":12.871875,"hasGameToday":true,"unhealthy":false},{"name":"Eric Staal","currentPosition":"C","posList":["C"],"value":12.338095238095237,"hasGameToday":true,"unhealthy":false},{"name":"Logan Couture","currentPosition":"LW","posList":["C","LW"],"value":12.317187500000001,"hasGameToday":true,"unhealthy":false},{"name":"Jonathan Drouin","currentPosition":"BN","posList":["C","LW"],"value":10.428571428571429,"hasGameToday":true,"unhealthy":false}],"positions":["RW","C","LW"],"positionCapacityMap":{"BN":13,"RW":3,"C":3,"G":2,"LW":3,"D":6}}'
  # input = json.loads(inputString)
  # debug = False

  min_cost_flow = pywrapgraph.SimpleMinCostFlow()
  # for indexMap, node 0 is s, node 1 is t, nodes 2-(2 + positions.length) are positions, nodes (2 + positions.length)-(2 + positions.length + players.length) are players
  indexMap = { 0: "s", 1: "t" }
  totalCapacity = 0
  errorStatusMap = {}
  errorStatusMap[min_cost_flow.OPTIMAL] = "OPTIMAL"
  errorStatusMap[min_cost_flow.FEASIBLE] = "FEASIBLE"
  errorStatusMap[min_cost_flow.INFEASIBLE] = "INFEASIBLE"
  errorStatusMap[min_cost_flow.NOT_SOLVED] = "NOT_SOLVED"
  errorStatusMap[min_cost_flow.BAD_RESULT] = "BAD_RESULT"
  errorStatusMap[min_cost_flow.BAD_COST_RANGE] = "BAD_COST_RANGE"
  errorStatusMap[min_cost_flow.UNBALANCED] = "UNBALANCED"

  for i in range(0, len(input["positions"])):
    pos = input["positions"][i]
    capacity = input["positionCapacityMap"][pos]
    totalCapacity += capacity
    indexMap[i + 2] = pos
    min_cost_flow.AddArcWithCapacityAndUnitCost(i + 2, 1, capacity, 0)

  for i in range(0, len(input["players"])):
    playerName = input["players"][i]["name"]
    playerValue = -int(round(input["players"][i]["value"] * 1000))

    playerNodeIndex =  2 + len(input["positions"]) + i
    indexMap[playerNodeIndex] = playerName
    min_cost_flow.AddArcWithCapacityAndUnitCost(0, playerNodeIndex, 1, playerValue)

  for i in range(0, len(input["players"])):
    playerNodeIndex =  2 + len(input["positions"]) + i
    posList = input["players"][i]["posList"]
    for j in range(0, len(posList)):
      if(posList[j] in input["positions"]):
        positionIndex = input["positions"].index(posList[j]) + 2
        min_cost_flow.AddArcWithCapacityAndUnitCost(playerNodeIndex, positionIndex, 1, 0)

  totalSupply = min(totalCapacity, len(input["players"]))

  min_cost_flow.SetNodeSupply(0, totalSupply)
  min_cost_flow.SetNodeSupply(1, -totalSupply)

  if(debug):
    print("total supply: %1s" % (totalSupply))
    print('Arc    Flow / Capacity  Cost')
    for i in range(min_cost_flow.NumArcs()):
      cost = min_cost_flow.UnitCost(i)
      print('%1s -> %1s   %3s       %3s' % (
          indexMap[min_cost_flow.Tail(i)],
          indexMap[min_cost_flow.Head(i)],
          min_cost_flow.Capacity(i),
          cost))
    print("-----------------------------")



  resultStatus = min_cost_flow.SolveMaxFlowWithMinCost()
  if resultStatus == min_cost_flow.OPTIMAL:
    out = {}
    for i in range(min_cost_flow.NumArcs()):
      if(debug):
        cost = min_cost_flow.Flow(i) * min_cost_flow.UnitCost(i)
        print('%1s -> %1s   %3s  / %3s       %3s' % (
          indexMap[min_cost_flow.Tail(i)],
          indexMap[min_cost_flow.Head(i)],
          min_cost_flow.Flow(i),
          min_cost_flow.Capacity(i),
          cost))
      if(min_cost_flow.Tail(i) != 0 and
         min_cost_flow.Tail(i) != 1 and
         min_cost_flow.Head(i) != 0 and
         min_cost_flow.Head(i) != 1 and
         min_cost_flow.Flow(i) == 1):
        playerName = indexMap[min_cost_flow.Tail(i)]
        assignedPosition = indexMap[min_cost_flow.Head(i)]
        out[playerName] = assignedPosition
    print(json.dumps(out))
  else:
    print("SimpleMinCostFlow error: %1s" % (errorStatusMap[resultStatus]))
    exit(1)

if __name__ == '__main__':
  main()
