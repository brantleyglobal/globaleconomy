template="GBDx.sol.bk"

for middle in {2..8}; do
  max_digit=$((middle + 2))
  for fl in $(seq 1 $max_digit); do
    dividend_name="Dividend${fl}${middle}${fl}"
    token_symbol="GBD${fl}${middle}${fl}"
    filename="${dividend_name}.sol"
    
    # Extract digits from dividend_name (e.g Dividend121)
    first_digit=$fl
    middle_digit=$middle
    last_digit=$fl
    
    # Set initial quarter and year offset based on first digit and middle digit
    # Basic example:
    if (( first_digit == 1 )); then
      init_quarter=1
      year_offset=0
    elif (( first_digit == 2 )); then
      init_quarter=2
      year_offset=0
    elif (( first_digit == 3 )); then
      init_quarter=3
      year_offset=0
    elif (( first_digit == 4 )); then
      init_quarter=4
      year_offset=0
    elif (( first_digit == 5 )); then
      init_quarter=1
      year_offset=1
    elif (( first_digit == 6 )); then
      init_quarter=2
      year_offset=1
    elif (( first_digit == 7 )); then
      init_quarter=3
      year_offset=1
    elif (( first_digit == 8 )); then
      init_quarter=4
      year_offset=1
    elif (( first_digit == 9 )); then
      init_quarter=1
      year_offset=2
    elif (( first_digit == 10 )); then
      init_quarter=2
      year_offset=2
    else
      init_quarter=1
      year_offset=0
    fi

    # Calculate initial year based on currentYear and year_offset
    init_year=$((currentYear + year_offset))
    
    echo "Creating $filename with quarter=$init_quarter and year=$init_year"

    sed -e "s/GlobalDominionX/$dividend_name/g" \
        -e "s/\"GlobalDomnionX\"/\"$dividend_name\"/g" \
        -e "s/\"GBDX\"/\"$token_symbol\"/g" \
        -e "s/COMMITTED_QUARTERS/$middle/g" \
        -e "s/INIT_QUARTER/$init_quarter/g" \
        -e "s/INIT_YEAR/$year_offset/g" \
        "$template" > "$filename"
  done
done

# Special final case adjusted accordingly
#dividend_name="Dividend080"
#token_symbol="GBD080"
#filename="${dividend_name}.sol"
#init_quarter=4
#init_year=$((currentYear + 1))
#sed -e "s/GlobalDominionX/$dividend_name/g" \
#    -e "s/\"GlobalDomnionX\"/\"$dividend_name\"/g" \
#    -e "s/\"GBDX\"/\"$token_symbol\"/g" \
#    -e "s/COMMITTED_QUARTERS/8/g" \
#    -e "s/INIT_QUARTER/$init_quarter/g" \
#    -e "s/INIT_YEAR/$year_offset/g" \
#    "$template" > "$filename"
